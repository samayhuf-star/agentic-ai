import { appOrigin } from "@/lib/config";
import { BUSINESS } from "@/lib/business";
import { addDays, addMonths, formatLongDate, formatWhen } from "@/lib/bonus/dates";
import { BONUS_KEYS, type BonusKey } from "@/lib/bonus/keys";
import { renderBrandEmail } from "@/lib/bonus/layout";
import { renderSwipePdf } from "@/lib/bonus/pdf";

export const SWIPE_PDF_FILENAME = "AI-Time-Machine-prompt-swipe-file.pdf";

export type BonusMailContext = {
  orderId: string;
  name: string | null;
  paidAt: Date;
};

export type BonusAttachment = { filename: string; content: Buffer };

export type RenderedBonusEmail = {
  key: BonusKey;
  subject: string;
  text: string;
  html: string;
  attachments: BonusAttachment[];
};

function hello(name: string | null) {
  const clean = (name || "").trim();
  if (!clean || clean.length > 40) return "Hello,";
  return `Hello ${clean},`;
}

function origin() {
  return appOrigin();
}

export async function renderBonusEmail(key: BonusKey, ctx: BonusMailContext): Promise<RenderedBonusEmail> {
  const start = formatWhen(ctx.paidAt);
  const startDay = formatLongDate(ctx.paidAt);
  const updatesEnd = formatLongDate(addMonths(ctx.paidAt, 12));
  const supportEnd = formatWhen(addDays(ctx.paidAt, 30));
  const greeting = hello(ctx.name);

  if (key === "swipe") {
    const pdf = await renderSwipePdf();
    const letter = renderBrandEmail({
      preheader: "Your ready-made prompt swipe file is attached.",
      kicker: "Bonus 1 · Swipe file",
      title: "Ready-made prompt swipe file",
      paragraphs: [
        greeting,
        "Your prompt swipe file is attached to this email. It is yours to keep.",
        "Inside are copy-and-use prompts for sales, support and operations. Paste one, add a few details about your shop, and edit the reply before you send it.",
        "You can download the same file from your dashboard any time.",
        "Nothing goes out to your customers until you decide to send it.",
      ],
      action: { href: `${origin()}/dashboard/swipe-file`, label: "Download the swipe file" },
    });
    return {
      key,
      subject: "Your prompt swipe file",
      ...letter,
      attachments: [{ filename: SWIPE_PDF_FILENAME, content: pdf }],
    };
  }

  if (key === "updates") {
    const letter = renderBrandEmail({
      preheader: `Fresh prompts each month until ${updatesEnd}.`,
      kicker: "Bonus 2 · Every month · 12 months",
      title: "Monthly prompt updates for a full year",
      paragraphs: [
        greeting,
        "Fresh, tested prompts land in your dashboard every month for 12 months. We also email each new set to you.",
      ],
      callout: `Your 12 months started on ${startDay}, the day this purchase was paid. They end on ${updatesEnd}.`,
      after: [
        "After that date, the prompts you already have stay yours. New months stop.",
        "The first set is already on your Updates page.",
      ],
      action: { href: `${origin()}/dashboard/updates`, label: "Open Updates" },
    });
    return { key, subject: "Your monthly prompt updates", ...letter, attachments: [] };
  }

  if (key === "templates") {
    const letter = renderBrandEmail({
      preheader: "Ready workflows for order follow-ups, new leads and weekly checks.",
      kicker: "Bonus 3 · Template library",
      title: "Template library for common business workflows",
      paragraphs: [
        greeting,
        "Ready workflows for everyday jobs are in your dashboard. Copy one, change the names and amounts, and send it yourself.",
        "You will find order follow-ups, a new-lead welcome, weekly stock checks, payment reminders, review requests, festival offers, appointment reminders, a complaint reply, and more.",
      ],
      action: { href: `${origin()}/dashboard/templates`, label: "Open the template library" },
    });
    return { key, subject: "Your template library", ...letter, attachments: [] };
  }

  const letter = renderBrandEmail({
    preheader: `Write to ${BUSINESS.supportEmail}. Your 30 days end on ${supportEnd}.`,
    kicker: "Bonus 4 · 30 days",
    title: "Priority email support for 30 days",
    paragraphs: [
      greeting,
      "Stuck on anything? Your emails jump the queue for your first 30 days.",
      `Write to ${BUSINESS.supportEmail} from the email address you paid with. A real person reads that queue.`,
      "This note is sent from no-reply@adiology.io. Use reply, or write straight to the support address. Replies come to support@theaitimemachine.com.",
      "We answer questions about signing in, your dashboard, and these bonuses.",
    ],
    callout: `Your 30 days started on ${start}, the day this purchase was paid. They end on ${supportEnd}.`,
    bullets: [
      "The email address you paid with",
      `Order reference ${ctx.orderId}`,
      "What you were trying to do",
      "What you saw on the screen",
      "A photo, if that makes it clearer",
    ],
    action: { href: `mailto:${BUSINESS.supportEmail}`, label: "Email support" },
  });
  return { key, subject: "Your priority email support", ...letter, attachments: [] };
}

export async function renderAllBonusEmails(ctx: BonusMailContext) {
  const emails: RenderedBonusEmail[] = [];
  for (const key of BONUS_KEYS) emails.push(await renderBonusEmail(key, ctx));
  return emails;
}
