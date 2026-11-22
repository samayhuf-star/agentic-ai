import { prisma } from "@/lib/prisma";
import { isProduction } from "@/lib/config";

export async function sendEmail(to: string, subject: string, text: string) {
  const from = process.env.EMAIL_FROM || "Boardroom <support@adiology.io>";
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend error", detail);
      throw new Error("Email could not be sent.");
    }
    await prisma.emailLog.create({ data: { toEmail: to, subject, body: text, provider: "resend" } });
    return { provider: "resend" as const };
  }
  console.log(`[email:mock] to ${to}\n${subject}\n${text}`);
  await prisma.emailLog.create({ data: { toEmail: to, subject, body: text, provider: "mock" } });
  return { provider: "mock" as const, devCode: isProduction() ? undefined : text };
}
