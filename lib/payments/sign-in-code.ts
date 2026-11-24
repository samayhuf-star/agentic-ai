import { prisma } from "@/lib/prisma";
import { isProduction } from "@/lib/config";
import { hashSecret, sixDigitCode } from "@/lib/crypto";
import { sendEmail } from "@/lib/messaging/email";

export const SIGN_IN_CODE_SUBJECT = "Your AI Time Machine code";
const TEN_MINUTES = 10 * 60 * 1000;

function codeText(code: string) {
  return `Your AI Time Machine code is ${code}. It expires in 10 minutes. If you did not ask for it, ignore this email.`;
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
          where: { toEmail: clean, subject: SIGN_IN_CODE_SUBJECT },
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
        await sendEmail(clean, SIGN_IN_CODE_SUBJECT, codeText(code), tx);
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
