import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isProduction } from "@/lib/config";
import { BUSINESS } from "@/lib/business";

type EmailWriter = Prisma.TransactionClient | typeof prisma;

export async function sendEmail(to: string, subject: string, text: string, db: EmailWriter = prisma, options: { from?: string } = {}) {
  const from = options.from || process.env.RESEND_FROM || "AI Time Machine <no-reply@adiology.io>";
  const provider = process.env.RESEND_API_KEY ? "resend" : "mock";
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text, reply_to: BUSINESS.supportEmail }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend error", detail);
      throw new Error("Email could not be sent.");
    }
  } else {
    console.log(`[email:mock] to ${to}\n${subject}\n${text}`);
  }
  await db.emailLog.create({ data: { toEmail: to, subject, body: text, provider } });
  return { provider: provider as "resend" | "mock", devCode: isProduction() ? undefined : text };
}
