import { prisma } from "@/lib/prisma";
import { appOrigin, isProduction } from "@/lib/config";
import { hashSecret, sixDigitCode } from "@/lib/crypto";
import { sendEmail } from "@/lib/messaging/email";

export const SIGN_IN_CODE_SUBJECT = "Payment of ₹1,999 confirmed — your sign-in code";
export const SIGN_IN_CODE_SUBJECTS = [SIGN_IN_CODE_SUBJECT, "Your AI Time Machine code"];
const TEN_MINUTES = 10 * 60 * 1000;

function rupees(amountInr: number) {
  return `₹${amountInr.toLocaleString("en-IN")}`;
}

export function fulfilmentEmail(code: string, email: string, amountInr = 1999) {
  const login = `${appOrigin()}/login?email=${encodeURIComponent(email)}`;
  const amount = rupees(amountInr);
  return {
    subject: SIGN_IN_CODE_SUBJECT,
    text: [
      `Payment of ${amount} confirmed.`,
      "",
      "Thank you for buying AI Time Machine. Your 6-digit sign-in code is " + code + ".",
      "It expires in 10 minutes.",
      "",
      "Sign in here. Your email is already filled in:",
      login,
      "",
      "On the next screen, enter this code. Future logins use this same email and a new one-time code we email you. There is no password.",
      "",
      "If you did not make this payment, write to support@theaitimemachine.com.",
      "",
      "— AI Time Machine",
      "support@theaitimemachine.com",
    ].join("\n"),
  };
}

function codeFromBody(body: string) {
  return body.match(/code is (\d{6})/)?.[1] || null;
}

export async function sendFulfilmentCode(orderId: string, email: string, mode: "once" | "resend") {
  const clean = email.trim().toLowerCase();
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${orderId} FOR UPDATE`;
        const payment = await tx.payment.findUnique({ where: { id: orderId } });
        if (!payment) return { ok: false as const, status: 404, message: "That payment was not found." };
        if (payment.isTest) return { ok: false as const, status: 409, message: "Test payments are not fulfilled." };

        const existing = await tx.loginCode.findFirst({
          where: { email: clean, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        const prior = await tx.emailLog.findFirst({
          where: { toEmail: clean, subject: { in: SIGN_IN_CODE_SUBJECTS } },
          orderBy: { createdAt: "desc" },
        });
        const priorCode = prior ? codeFromBody(prior.body) : null;
        const reusable = Boolean(existing && priorCode && existing.codeHash === hashSecret(priorCode));

        if (reusable && mode === "once") {
          return { ok: true as const, status: 200, reused: true, sent: false, message: "Code already sent. The code in that email still works.", code: priorCode };
        }

        const code = reusable && priorCode ? priorCode : sixDigitCode();
        if (!reusable) {
          await tx.loginCode.deleteMany({ where: { email: clean } });
          await tx.loginCode.create({
            data: { email: clean, codeHash: hashSecret(code), expiresAt: new Date(Date.now() + TEN_MINUTES) },
          });
        }
        const note = fulfilmentEmail(code, clean, payment.amountInr);
        await sendEmail(clean, note.subject, note.text, tx);
        return {
          ok: true as const,
          status: 200,
          reused: reusable,
          sent: true,
          code,
          message: reusable
            ? "We sent the same code again. The code in the first email still works."
            : "A new code is on the way. Earlier codes will not work.",
        };
      },
      { timeout: 20000 },
    );
    const showCode = Boolean(result.ok && result.code && (!isProduction() || !process.env.RESEND_API_KEY));
    return { ...result, devCode: showCode && result.ok ? result.code : undefined };
  } catch (error) {
    console.error("sign-in code", error);
    return { ok: false as const, status: 502, message: "The code could not be emailed. Wait a minute and try again." };
  }
}
