import { signOutUser } from "@/core/internal/utils";
import type { BunRequest } from "bun";
export async function POST(req: BunRequest) {
  return signOutUser();
}
