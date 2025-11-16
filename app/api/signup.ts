import { signupUser } from "@/core/internal/utils";
import type { BunRequest } from "bun";
import { Database } from "bun:sqlite";

const db = new Database("./app/db/db.sqlite");

export async function POST(req: BunRequest) {
  const formData = await req.formData();
  const email = formData.get("email") as string;
  const username = formData.get("username") as string;
  const rawPassword = formData.get("password") as string;
  const resp = await signupUser(email, username, rawPassword);
  if (resp.success) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/signup",
    },
  });
}
