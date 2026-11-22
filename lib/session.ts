import { cookies } from "next/headers";
import { getSessionFromToken, SESSION_COOKIE } from "@/lib/auth";

export async function getSession() {
  const jar = await cookies();
  return getSessionFromToken(jar.get(SESSION_COOKIE)?.value);
}
