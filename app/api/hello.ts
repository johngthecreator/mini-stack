import type { BunRequest } from "bun";

export function GET(req: BunRequest) {
  return new Response(JSON.stringify({ message: "hi" }), { status: 200 });
}
