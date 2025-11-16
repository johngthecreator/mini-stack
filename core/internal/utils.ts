import { file, type BunRequest } from "bun";
import { Database } from "bun:sqlite";

const db = new Database("./app/db/db.sqlite", { create: true });

const TOKEN_EXPIRY_SECONDS = 3600;
const JWT_SECRET = "your_strong_and_secure_secret_key";
const TOKEN_COOKIE_NAME = "token";

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

function parseCookies(req: BunRequest): Record<string, string> {
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

// DB

interface FieldDefinition {
  type: string;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  nullable?: boolean;
  maxLength?: number;
  default?: string | number;
  onUpdate?: string;
}

interface IndexDefinition {
  fields: string[];
}

interface ModelDefinition {
  table: string;
  fields: Record<string, FieldDefinition>;
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

  // Loop through each model defined in the schema (e.g., "User")
  for (const modelName in schema.models) {
    const model = schema.models[modelName];
    const tableName = model?.table;
    const query = db.query(`DROP TABLE IF EXISTS ${tableName}`);
    query.run();

    const columnDefinitions: string[] = [];

    // Loop 1: Process all fields for this model (e.g., "id", "email")
    for (const fieldName in model?.fields) {
      const field = model.fields[fieldName];

      // Start building the column definition
      let columnSql = `  "${fieldName}" ${mapJsonTypeToSql(
        (field as FieldDefinition).type
      )}`;

      // Add constraints
      if (field?.primaryKey) {
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

      // Handle default values
      if (field?.default !== undefined) {
        if (field.default === "now") {
          // SQLite uses CURRENT_TIMESTAMP
          columnSql += " DEFAULT CURRENT_TIMESTAMP";
        } else if (typeof field.default === "string") {
          // Escape single quotes for SQL
          columnSql += ` DEFAULT '${field.default.replace(/'/g, "''")}'`;
        } else {
          // Numbers (e.g., 0 for boolean)
          columnSql += ` DEFAULT ${field.default}`;
        }
      }

      // Handle onUpdate (requires a trigger in SQLite)
      if (field?.onUpdate === "now") {
        columnSql +=
          " /* ON UPDATE CURRENT_TIMESTAMP (requires trigger in SQLite) */";
      }

      columnDefinitions.push(columnSql);
    }

    // Assemble and add the CREATE TABLE statement
    const createTableSql = `CREATE TABLE "${tableName}" (\n${columnDefinitions.join(
      ",\n"
    )}\n);`;
    allStatements.push(createTableSql);

    // Loop 2: Process table-level indexes as separate statements
    if (model?.indexes) {
      for (const index of model.indexes) {
        // Check if this index is redundant (already covered by `unique: true`)
        if (index.fields.length === 1) {
          const fieldName = index.fields[0];
          if (model.fields[fieldName as string]?.unique) {
            // This index is already created by the "UNIQUE" constraint.
            // Skipping to avoid redundancy.
            continue;
          }
        }

        // Create a name for the index
        const indexName = `${tableName}_${index.fields.join("_")}_idx`;
        const indexFields = index.fields.map((f) => `"${f}"`).join(", ");

        // Add the separate CREATE INDEX statement
        const createIndexSql = `CREATE INDEX "${indexName}" ON "${tableName}" (${indexFields});`;
        allStatements.push(createIndexSql);
      }
    }
  }

  // Join all statements into one giant string
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
