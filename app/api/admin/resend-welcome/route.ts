import { json, readJson, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/messaging/email";
import { welcomeEmail } from "@/lib/copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return json({ message: "Admins only." }, 403);
  const body = await readJson(request);
  const user = await prisma.user.findUnique({ where: { id: String(body.userId || "") } });
  if (!user?.email) return json({ message: "This person has not added an email yet." }, 400);
  const note = welcomeEmail(user);
  await sendEmail(user.email, note.subject, note.text);
  await prisma.user.update({ where: { id: user.id }, data: { welcomeEmailSentAt: new Date() } });
  return json({ ok: true, message: "Welcome email sent again." });
}
