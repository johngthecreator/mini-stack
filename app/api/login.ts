import { loginUser } from "@/core/internal/utils";
import type { BunRequest } from "bun";

export async function POST(req: BunRequest) {
  const formData = await req.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  try {
    return loginUser(email, password);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
}
