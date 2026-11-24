import { json, readJson, requireAdmin } from "@/lib/api";
import { isEmail } from "@/lib/auth";
import { sendEmail } from "@/lib/messaging/email";
import { BUSINESS } from "@/lib/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return json({ message: "Admins only." }, 403);
  const body = await readJson(request);
  const to = String(body.to || admin.email).trim();
  if (!isEmail(to)) return json({ message: "Enter a valid email." }, 400);
  try {
    await sendEmail(
      to,
      "AI Time Machine test email",
      [
        "This is a test from AI Time Machine.",
        "",
        "If you can read this, email sending is working.",
        "",
        BUSINESS.legalName,
        BUSINESS.address,
        BUSINESS.phone,
        BUSINESS.supportEmail,
      ].join("\n"),
    );
  } catch {
    return json({ message: "The email was not sent. Check the Resend key and the from address." }, 502);
  }
  return json({ ok: true, message: `Test email sent to ${to}.` });
}
