import { json, readJson } from "@/lib/api";
import { requestLoginCode } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const result = await requestLoginCode(String(body.email || ""), request);
  return json({ message: result.message, devCode: "devCode" in result ? result.devCode : undefined }, result.status);
}
