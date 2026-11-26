import { logEvent } from "@/lib/activity/log";
import { prisma } from "@/lib/prisma";

const MANUAL_AT = new Date("2026-11-26T21:17:00.000Z");
const MANUAL_SUMMARY = "Manual recovery email sent from Gmail, 27 Nov 03:17";

const MANUAL_SENDS: Array<{ email: string; paymentIds: string[]; name: string }> = [
  { name: "Salman Alam", email: "alamsalman3679@gmail.com", paymentIds: ["brce618f28387c7233", "br076d4b7a7d01b4b6"] },
  { name: "Sunil", email: "sunil9797u@gmail.com", paymentIds: ["br209ad6766039f8f6"] },
  { name: "Rekha Robidas", email: "robidasrekha106@gmail.com", paymentIds: ["br13812ff5e8213b9a"] },
];

type RecoveryRow = {
  email: string;
  paymentId: string;
  step: "r1" | "r2" | "r3";
  resendId: string;
  at: string;
  subject: string;
};

// last_event was "delivered" on all of these when checked on 27 Nov 2026.
const RECOVERY_DELIVERED: RecoveryRow[] = [
  { email: "harpindersekhonh01@gmail.com", paymentId: "br55aea006dc0e9740", step: "r1", resendId: "01a21704-618c-7bcf-95a0-76dedf3eb61f", at: "2026-11-26T08:41:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "harpindersekhonh01@gmail.com", paymentId: "br55aea006dc0e9740", step: "r2", resendId: "01a2170d-8a0d-7b3e-b2b6-1d7392f3b47a", at: "2026-11-26T08:51:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "harpindersekhonh01@gmail.com", paymentId: "br55aea006dc0e9740", step: "r3", resendId: "01a21773-20ab-717e-8565-8554258ecf5a", at: "2026-11-26T10:42:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
  { email: "soyalbisaytu@gmail.com", paymentId: "brcbbaf2e763d32035", step: "r1", resendId: "01a2170b-b509-78ed-8a6c-9a2b1ac068fd", at: "2026-11-26T08:49:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "soyalbisaytu@gmail.com", paymentId: "brcbbaf2e763d32035", step: "r2", resendId: "01a21714-dd12-73a1-a8d4-2bab329b07c4", at: "2026-11-26T08:59:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "soyalbisaytu@gmail.com", paymentId: "brcbbaf2e763d32035", step: "r3", resendId: "01a2177a-7398-7d6b-a246-1bbb020bbf23", at: "2026-11-26T10:50:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
  { email: "geetanjalipatra03794@gmail.com", paymentId: "br3137df9a6230ec52", step: "r1", resendId: "01a2180d-6252-7e35-8181-1d8979e2d39d", at: "2026-11-26T13:31:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "geetanjalipatra03794@gmail.com", paymentId: "br3137df9a6230ec52", step: "r2", resendId: "01a21816-a943-7676-b7d8-6ce3a8aee024", at: "2026-11-26T13:41:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "geetanjalipatra03794@gmail.com", paymentId: "br3137df9a6230ec52", step: "r3", resendId: "01a2187b-5e98-75bd-8615-62c49b16cf13", at: "2026-11-26T15:31:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
  { email: "kavitadevikyp089@gmail.com", paymentId: "braf2e6b9b3c954955", step: "r1", resendId: "01a21816-a7c0-764c-9481-3ba9df87d982", at: "2026-11-26T13:41:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "kavitadevikyp089@gmail.com", paymentId: "braf2e6b9b3c954955", step: "r2", resendId: "01a21820-ba22-79b6-af41-a89325b10f95", at: "2026-11-26T13:52:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "kavitadevikyp089@gmail.com", paymentId: "braf2e6b9b3c954955", step: "r3", resendId: "01a21884-8670-748f-ae27-218e54617639", at: "2026-11-26T15:41:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
  { email: "farooqkhan078645@gmail.com", paymentId: "br2f707c116ea5e686", step: "r1", resendId: "01a2181c-8333-73ba-a860-d369e1c5c7d5", at: "2026-11-26T13:47:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "farooqkhan078645@gmail.com", paymentId: "br2f707c116ea5e686", step: "r2", resendId: "01a21826-38e2-7b44-b4ce-a5622834ddc1", at: "2026-11-26T13:58:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "farooqkhan078645@gmail.com", paymentId: "br2f707c116ea5e686", step: "r3", resendId: "01a2188a-eef1-7d67-9487-7016fc54e333", at: "2026-11-26T15:48:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
  { email: "talasaniyahardik4@gmail.com", paymentId: "br5a8944d432ad6944", step: "r1", resendId: "01a2187d-33a0-71cf-9be3-5ca9de56f0cf", at: "2026-11-26T15:33:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "talasaniyahardik4@gmail.com", paymentId: "br5a8944d432ad6944", step: "r2", resendId: "01a21887-455c-73d4-82af-60fdc8807140", at: "2026-11-26T15:44:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "talasaniyahardik4@gmail.com", paymentId: "br5a8944d432ad6944", step: "r3", resendId: "01a218eb-1156-7cc2-99b3-f09e3f071f7f", at: "2026-11-26T17:33:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
  { email: "madarjumika@gmail.com", paymentId: "br0f8fe5573180a621", step: "r1", resendId: "01a218cc-da9e-7cd5-a4fc-b427b2fc6727", at: "2026-11-26T17:00:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "madarjumika@gmail.com", paymentId: "br0f8fe5573180a621", step: "r2", resendId: "01a218d6-0241-7ba7-8550-f6215148af42", at: "2026-11-26T17:10:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "madarjumika@gmail.com", paymentId: "br0f8fe5573180a621", step: "r3", resendId: "01a2193a-bd6f-775d-98de-03b509f111cc", at: "2026-11-26T19:00:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
  { email: "rashidbrn20@gmail.com", paymentId: "br60d9005f0c59a15c", step: "r1", resendId: "01a218e6-7cfe-75f5-bc5e-f0892fff5ac4", at: "2026-11-26T17:28:00.000Z", subject: "Your ₹1,999 payment did not go through. Finish it in one tap" },
  { email: "rashidbrn20@gmail.com", paymentId: "br60d9005f0c59a15c", step: "r2", resendId: "01a218ef-a58f-757d-930c-de7a1b7f35a1", at: "2026-11-26T17:38:00.000Z", subject: "Your AI Time Machine order is still saved" },
  { email: "rashidbrn20@gmail.com", paymentId: "br60d9005f0c59a15c", step: "r3", resendId: "01a21954-61e7-7951-b40a-557141fb7a93", at: "2026-11-26T19:28:00.000Z", subject: "Still want AI Time Machine? Your order is waiting" },
];

async function recordEmailEvent(input: {
  createdAt: Date;
  type: string;
  email: string;
  resendId?: string | null;
  leadId?: string | null;
  paymentId?: string | null;
  subject?: string | null;
  detail?: string | null;
  dedupeKey: string;
}) {
  try {
    await prisma.emailEvent.create({
      data: {
        createdAt: input.createdAt,
        type: input.type,
        email: input.email,
        resendId: input.resendId || null,
        leadId: input.leadId || null,
        paymentId: input.paymentId || null,
        subject: input.subject || null,
        detail: input.detail || null,
        dedupeKey: input.dedupeKey,
      },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
    if (code !== "P2002") throw error;
  }
}

export async function backfillEmailTracking() {
  const emails = [...new Set([...MANUAL_SENDS.map((row) => row.email), ...RECOVERY_DELIVERED.map((row) => row.email)])];
  const leads = await prisma.lead.findMany({
    where: { email: { in: emails, mode: "insensitive" } },
    select: { id: true, email: true, orderId: true },
  });
  const leadByOrder = new Map(leads.map((row) => [row.orderId, row]));
  const leadByEmail = new Map(leads.filter((row) => row.email).map((row) => [row.email!.toLowerCase(), row]));

  for (const send of MANUAL_SENDS) {
    const lead = leadByEmail.get(send.email);
    for (const paymentId of send.paymentIds) {
      await recordEmailEvent({
        createdAt: MANUAL_AT,
        type: "email.manual",
        email: send.email,
        leadId: leadByOrder.get(paymentId)?.id || lead?.id || null,
        paymentId,
        subject: MANUAL_SUMMARY,
        detail: `Manual recovery email sent from Gmail (samayhuf@gmail.com) to ${send.name}`,
        dedupeKey: `manual-gmail:${paymentId}:2026-11-26T21:17:00Z`,
      });
      await logEvent({
        type: "recovery_email_manual",
        at: MANUAL_AT,
        email: send.email,
        paymentId,
        status: "manual",
        source: "gmail",
        summary: MANUAL_SUMMARY,
        detail: `Sent from samayhuf@gmail.com to ${send.name}`,
        dedupeKey: `manual-gmail-sys:${paymentId}:2026-11-26T21:17:00Z`,
      });
    }
  }

  for (const row of RECOVERY_DELIVERED) {
    const lead = leadByOrder.get(row.paymentId) || leadByEmail.get(row.email);
    const at = new Date(row.at);
    await recordEmailEvent({
      createdAt: at,
      type: "email.delivered",
      email: row.email,
      resendId: row.resendId,
      leadId: lead?.id || null,
      paymentId: row.paymentId,
      subject: row.subject,
      detail: `Automated recovery ${row.step} delivered`,
      dedupeKey: `${row.resendId}:email.delivered:${row.at}`,
    });
    await logEvent({
      type: "email.delivered",
      at,
      email: row.email,
      paymentId: row.paymentId,
      status: "delivered",
      source: "resend",
      summary: `Email delivered: ${row.subject}`,
      detail: `Automated recovery ${row.step} · resend ${row.resendId}`,
      dedupeKey: `sys:${row.resendId}:email.delivered:${row.at}`,
    });
  }
}
