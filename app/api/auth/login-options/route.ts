import { json, readJson } from "@/lib/api";
import { loginOptions } from "@/lib/auth-pin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const result = await loginOptions(String(body.email || ""));
  return json({ message: result.message, pin: result.pin }, result.status);
}
