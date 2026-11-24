import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { isAdminEmail, isStaffEmail } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function requireUser(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function denyStaffMutation(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || isAdminEmail(session.email) || !isStaffEmail(session.email)) return null;
  return json({ message: "Staff can view this. Changes are limited to admins." }, 403);
}

export async function requireAdmin(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || !isAdminEmail(session.email)) return null;
  return session;
}
