import { appOrigin, formatInr } from "@/lib/config";
import { formatUsdCents } from "@/lib/us";
import { sendEmail } from "@/lib/messaging/email";
import { prisma } from "@/lib/prisma";
import { sendOwnerWhatsApp } from "@/lib/alerts/whatsapp";

export type AlertKind = "checkout_started" | "payment_received" | "payment_failed" | "first_login" | "test";

export type AlertInput = {
  kind: AlertKind;
  dedupeKey?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  amountInr?: number | null;
  amountUsdCents?: number | null;
  currency?: string | null;
  orderId?: string | null;
  status: string;
};

function ownerEmails() {
  return (process.env.OWNER_ALERT_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function istNow() {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date());
}

function amountLabel(input: AlertInput) {
  if ((input.currency || "").toUpperCase() === "USD" && input.amountUsdCents != null) return formatUsdCents(input.amountUsdCents);
  if (input.amountInr != null) return formatInr(input.amountInr);
  return "";
}

function subjectFor(input: AlertInput) {
  const who = input.name || input.email || input.phone || "someone";
  const amount = amountLabel(input);
  if (input.kind === "payment_received") return `[AI Time Machine] Payment received ${amount} — ${who}`.trim();
  if (input.kind === "payment_failed") return `[AI Time Machine] Payment ${input.status} ${amount} — ${who}`.trim();
  if (input.kind === "checkout_started") return `[AI Time Machine] Checkout started ${amount} — ${who}`.trim();
  if (input.kind === "first_login") return `[AI Time Machine] First login — ${who}`;
  return `[AI Time Machine] Test alert — ${who}`;
}

function bodyFor(input: AlertInput) {
  return [
    `Name: ${input.name || "—"}`,
    `Email: ${input.email || "—"}`,
    `Phone: ${input.phone || "—"}`,
    `Amount: ${amountLabel(input) || "—"}`,
    `Order: ${input.orderId || "—"}`,
    `Status: ${input.status}`,
    `Time (IST): ${istNow()}`,
    `Admin: ${appOrigin()}/sup-admin`,
  ].join("\n");
}

function lineFor(input: AlertInput) {
  const who = input.email || input.phone || input.name || "someone";
  const amount = amountLabel(input);
  return `AI Time Machine: ${input.kind.replaceAll("_", " ")} ${amount} ${who} ${input.orderId || ""}`.replace(/\s+/g, " ").trim();
}

async function alreadySent(dedupeKey: string | null | undefined, channel: string) {
  if (!dedupeKey) return false;
  const row = await prisma.alertLog.findUnique({ where: { dedupeKey_channel: { dedupeKey, channel } } });
  return row?.status === "sent";
}

async function writeLog(input: {
  kind: string;
  channel: string;
  status: string;
  dedupeKey?: string | null;
  toAddress: string;
  subject: string;
  body: string;
  error?: string | null;
}) {
  if (!input.dedupeKey) {
    await prisma.alertLog.create({ data: { ...input, dedupeKey: null } });
    return;
  }
  await prisma.alertLog.upsert({
    where: { dedupeKey_channel: { dedupeKey: input.dedupeKey, channel: input.channel } },
    create: { ...input, dedupeKey: input.dedupeKey },
    update: { status: input.status, error: input.error, subject: input.subject, body: input.body, toAddress: input.toAddress },
  });
}

async function once<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch {
    return run();
  }
}

export async function deliverOwnerAlert(input: AlertInput) {
  const subject = subjectFor(input);
  const body = bodyFor(input);
  const emails = ownerEmails();
  if (emails.length > 0 && !(await alreadySent(input.dedupeKey, "email"))) {
    try {
      await once(() => Promise.all(emails.map((email) => sendEmail(email, subject, body))));
      await writeLog({ kind: input.kind, channel: "email", status: "sent", dedupeKey: input.dedupeKey, toAddress: emails.join(", "), subject, body });
    } catch (error) {
      await writeLog({
        kind: input.kind,
        channel: "email",
        status: "failed",
        dedupeKey: input.dedupeKey,
        toAddress: emails.join(", "),
        subject,
        body,
        error: error instanceof Error ? error.message : "Email failed.",
      });
    }
  }

  const provider = (process.env.WHATSAPP_PROVIDER || "none").trim().toLowerCase();
  if (provider !== "none" && !(await alreadySent(input.dedupeKey, "whatsapp"))) {
    const text = lineFor(input);
    try {
      const result = await once(() => sendOwnerWhatsApp(text));
      if ("skipped" in result) return;
      if (!result.ok) throw new Error(result.error);
      await writeLog({
        kind: input.kind,
        channel: "whatsapp",
        status: "sent",
        dedupeKey: input.dedupeKey,
        toAddress: process.env.OWNER_WHATSAPP_NUMBER || "",
        subject: text,
        body: text,
      });
    } catch (error) {
      await writeLog({
        kind: input.kind,
        channel: "whatsapp",
        status: "failed",
        dedupeKey: input.dedupeKey,
        toAddress: process.env.OWNER_WHATSAPP_NUMBER || "",
        subject: text,
        body: text,
        error: error instanceof Error ? error.message : "WhatsApp failed.",
      });
    }
  }
}

export function queueOwnerAlert(input: AlertInput) {
  void deliverOwnerAlert(input).catch((error) => console.error("owner alert", error));
}
