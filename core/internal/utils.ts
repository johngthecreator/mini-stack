import { file, type BunRequest } from "bun";
import { Database } from "bun:sqlite";

const db = new Database("./app/db/db.sqlite", { create: true });

const TOKEN_EXPIRY_SECONDS = 3600;
const JWT_SECRET = "your_strong_and_secure_secret_key";
const TOKEN_COOKIE_NAME = "token";

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type LoaderFunction = (
  req: BunRequest
) => Promise<Response | {}> | Response | {};

type ApiHandler = (req: BunRequest) => Promise<Response> | Response;

export interface Route {
  path: string;
  view?: any; // Component type, adjust as needed
  loader?: LoaderFunction;
  api?: Partial<Record<HTTPMethod, ApiHandler>>;
}

interface JWTPayload {
  userId: number;
  email: string;
  [key: string]: any;
}

interface DecodedPayload extends JWTPayload {
  exp: number;
}

export async function createJWT(payload: object, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encoder = new TextEncoder();

  const toBase64url = (base64: string): string => {
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const headerBase64 = btoa(JSON.stringify(header));
  const headerB64url = toBase64url(headerBase64);

  const payloadBase64 = btoa(JSON.stringify(payload));
  const payloadB64url = toBase64url(payloadBase64);

  const data = `${headerB64url}.${payloadB64url}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureUint8Array = new Uint8Array(signature);

  const signatureBase64 = btoa(
    String.fromCharCode.apply(null, signatureUint8Array as any)
  );

  const signatureB64url = toBase64url(signatureBase64);

  return `${data}.${signatureB64url}`;
}

export async function verifyJWT(token: string, secret: string) {
  const [headerB64url, payloadB64url, signatureB64url] = token.split(".");
  const data = `${headerB64url}.${payloadB64url}`;

  const encoder = new TextEncoder();

  const fromBase64url = (base64url: string): string => {
    let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return base64;
  };

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBase64 = fromBase64url(signatureB64url as string);

  const signature = Uint8Array.from(atob(signatureBase64), (c) =>
    c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(data)
  );

  if (valid) {
    const payloadBase64 = fromBase64url(payloadB64url as string);
    return JSON.parse(atob(payloadBase64));
  } else {
    return null;
  }
}

export function parseCookies(req: BunRequest): Record<string, string> {
  const cookieHeader = req.headers.get("Cookie");
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.trim().split("=");
    const name = parts[0];
    const value = parts.slice(1).join("=");
    cookies[name as string] = value;
  });
  return cookies;
}

export function authLoader<T>(
  loader: (req: BunRequest, payload: DecodedPayload) => Promise<T>
) {
  return async (req: BunRequest): Promise<T | Response> => {
    const token = parseCookies(req)[TOKEN_COOKIE_NAME];
    const url = new URL(req.url);

    if (url.pathname === "/login" || url.pathname === "/signup") {
      if (token) {
        try {
          const decodedPayload = (await verifyJWT(
            token,
            JWT_SECRET
          )) as DecodedPayload | null;
          const now = Math.floor(Date.now() / 1000);
          if (
            decodedPayload &&
            decodedPayload.exp &&
            decodedPayload.exp > now
          ) {
            return new Response(null, {
              status: 302,
              headers: { Location: "/" },
            });
          }
        } catch {
          return new Response(null, {
            status: 302,
            headers: { Location: "/login" },
          });
        }
      }
      return loader(req, null as any);
    }

    if (!token) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      const decodedPayload = (await verifyJWT(
        token,
        JWT_SECRET
      )) as DecodedPayload | null;

      if (!decodedPayload) {
        throw new Error("Invalid signature or structure");
      }

      const now = Math.floor(Date.now() / 1000);
      if (decodedPayload.exp && decodedPayload.exp < now) {
        throw new Error("Token expired");
      }

      return loader(req, decodedPayload);
    } catch (err) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }
  };
}

export async function signupUser(
  email: string,
  username: string,
  rawPassword: string
) {
  try {
    const checkQuery = db.query("SELECT id FROM users WHERE email = $email");
    const existingUser = checkQuery.get({ $email: email });

    if (existingUser) {
      return { success: false, message: "User already exists!" };
    }
  } catch (e) {
    return { success: false, message: "Internal Server Error during check." };
  }

  const hashedPassword = await Bun.password.hash(rawPassword);

  try {
    const insertQuery = db.query(
      "INSERT INTO users (email, username, password) VALUES ($email, $username, $password)"
    );
    insertQuery.run({
      $email: email,
      $username: username,
      $password: hashedPassword,
    });

    return { success: true, message: "User created successfully." };
  } catch (e) {
    return {
      success: false,
      message: "Internal Server Error during insertion.",
    };
  }
}

export async function loginUser(
  email: string,
  rawPassword: string
): Promise<Response> {
  const userQuery = db.query(
    "SELECT id, email, password FROM users WHERE email = $email"
  );
  const user: any = userQuery.get({ $email: email });

  if (!user) {
    return new Response("Invalid credentials", { status: 400 });
  }

  const isMatch = await Bun.password.verify(rawPassword, user.password);

  if (!isMatch) {
    return new Response("Invalid credentials", { status: 400 });
  }

  const payload = { userId: user.id, email: user.email };
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const token = await createJWT({ ...payload, exp }, JWT_SECRET);

  const maxAge = TOKEN_EXPIRY_SECONDS;

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
    },
  });
}

export function signOutUser() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
    },
  });
}

// DB

interface ForeignKeyDefinition {
  table: string;
  column?: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

interface FieldDefinition {
  type: string;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  nullable?: boolean;
  maxLength?: number;
  default?: string | number;
  onUpdate?: string;
  references?: ForeignKeyDefinition;
}

interface IndexDefinition {
  fields: string[];
}

interface ModelDefinition {
  table: string;
  fields: Record<string, FieldDefinition>;
  primaryKey?: string[]; // Add composite primary key support here
  indexes?: IndexDefinition[];
}

interface SchemaInput {
  models: Record<string, ModelDefinition>;
}

function mapJsonTypeToSql(type: string): string {
  switch (type) {
    case "integer":
      return "INTEGER";
    case "boolean":
      return "INTEGER";
    case "string":
    case "text":
    case "timestamp":
    case "date":
    case "json":
      return "TEXT";
    case "float":
    case "decimal":
      return "REAL";
    case "blob":
      return "BLOB";
    default:
      return type.toUpperCase();
  }
}

export function generateSqlSchema(schema: SchemaInput): string[] {
  const allStatements: string[] = [];

  for (const modelName in schema.models) {
    const model = schema.models[modelName];
    const tableName = model?.table;

    // Drop existing table
    const query = db.query(`DROP TABLE IF EXISTS ${tableName}`);
    query.run();

    const columnDefinitions: string[] = [];

    // Create a Set of composite primary key columns, if any
    const compositePrimaryKeys = new Set(model?.primaryKey ?? []);

    for (const fieldName in model?.fields) {
      const field = model.fields[fieldName];

      let columnSql = `  "${fieldName}" ${mapJsonTypeToSql(
        (field as FieldDefinition).type
      )}`;

      // Only add inline PRIMARY KEY if not part of composite primary key
      if (field?.primaryKey && compositePrimaryKeys.size === 0) {
        columnSql += " PRIMARY KEY";
        if (field?.autoIncrement) {
          columnSql += " AUTOINCREMENT";
        }
      }

      if (field?.nullable === false) {
        columnSql += " NOT NULL";
      }

      if (field?.unique) {
        columnSql += " UNIQUE";
      }

      if (field?.default !== undefined) {
        if (field.default === "now") {
          columnSql += " DEFAULT CURRENT_TIMESTAMP";
        } else if (typeof field.default === "string") {
          columnSql += ` DEFAULT '${field.default.replace(/'/g, "''")}'`;
        } else {
          columnSql += ` DEFAULT ${field.default}`;
        }
      }

      if (field?.references) {
        const ref = field.references;
        const refColumn = ref.column ?? "id";
        columnSql += ` REFERENCES "${ref.table}"("${refColumn}")`;
        if (ref.onDelete) {
          columnSql += ` ON DELETE ${ref.onDelete}`;
        }
        if (ref.onUpdate) {
          columnSql += ` ON UPDATE ${ref.onUpdate}`;
        }
      }

      if (field?.onUpdate === "now") {
        columnSql +=
          " /* ON UPDATE CURRENT_TIMESTAMP (requires trigger in SQLite) */";
      }

      columnDefinitions.push(columnSql);
    }

    // Append table-level composite primary key declaration, if defined
    if (compositePrimaryKeys.size > 0) {
      const cols = Array.from(compositePrimaryKeys).map((col) => `"${col}"`);
      columnDefinitions.push(`PRIMARY KEY (${cols.join(", ")})`);
    }

    const createTableSql = `CREATE TABLE "${tableName}" (\n${columnDefinitions.join(
      ",\n"
    )}\n);`;

    allStatements.push(createTableSql);

    // Create indexes skipping those redundant with UNIQUE
    if (model?.indexes) {
      for (const index of model.indexes) {
        if (index.fields.length === 1) {
          const f = index.fields[0];
          if (model?.fields[f as string]?.unique) continue;
        }

        const indexName = `${tableName}_${index.fields.join("_")}_idx`;
        const indexFields = index.fields.map((f) => `"${f}"`).join(", ");
        allStatements.push(
          `CREATE INDEX "${indexName}" ON "${tableName}" (${indexFields});`
        );
      }
    }
  }

  return allStatements;
}

const dbModelHistory = "./core/internal/dbModelHistory";

export async function loadPrevious() {
  const f = file(dbModelHistory);
  if (await f.exists()) {
    return await f.text();
  }
  return null;
}

export async function saveNew(value: string) {
  await Bun.write(dbModelHistory, value);
}

export function hasChanged(oldValue: string | null, newValue: string) {
  return oldValue !== newValue;
}

export function createTables(rawModelText: string) {
  const dbModels = Bun.YAML.parse(rawModelText);

  const sqlStrings = generateSqlSchema(dbModels as SchemaInput);
  sqlStrings.forEach((sqlString) => {
    const query = db.query(sqlString);
    query.run();
  });
}
