export type HelpArticle = {
  slug: string;
  title: string;
  description: string;
  body: string;
};

export const helpArticles: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started after you pay",
    description: "What happens after a successful payment, and how to sign in for the first time.",
    body: `After a successful payment, we email a sign-in code to the address you used at checkout. Access is digital — there is nothing to ship.

## Sign in

1. Open [the sign-in page](/login).
2. Enter the same email you paid with.
3. We email a 6-digit code. Paste or type it to enter your account.
4. If the code does not arrive, check spam. You can request a new code from the sign-in page.

If you paid and still cannot get in, write to [support@theaitimemachine.com](mailto:support@theaitimemachine.com) from the email address you paid with.

## First steps inside the product

- Complete your business profile: name, what you sell, and a starting goal.
- Look at the team you have been given. You can change who sits where later.
- Connect your own AI key when you are ready to run a task. See [Connecting your AI key](/help/connect-ai-key).
- Nothing is posted, emailed to a customer, or spent until you say yes. See [The yes queue](/help/yes-queue).

Agents do not run on their own in the background yet. They prepare drafts and ideas for you to review.
`,
  },
  {
    slug: "connect-ai-key",
    title: "Connecting your AI key",
    description: "How AI features run on a key you already have with Claude, ChatGPT, or Grok.",
    body: `AI Time Machine provides the skills and the place to manage drafts. AI features run on an account you already have with an AI provider.

You can connect a key from Anthropic (Claude), OpenAI (ChatGPT) or xAI (Grok). Those providers bill you separately under their own terms. The ₹1,999 fee does not include that usage.

## How to connect a key

1. Sign in and open Settings.
2. Paste your API key in the field provided.
3. Use the test action to confirm the key works.
4. Save. You can remove or replace the key later.

## How we store it

The key is stored encrypted on our server (AES-256-GCM) and used only to send your chats to that provider. We do not use your key for other customers or for our own work.

Chat text you type, and the drafts that come back, are sent to the provider whose key you connected. That provider’s privacy policy also applies.

## If something fails

- Check that the key is active and has credit or quota with the provider.
- Try the test action again.
- If the product still cannot use the key, email [support@theaitimemachine.com](mailto:support@theaitimemachine.com). Do not paste the full key in your email if you can avoid it — say which provider it is, and what error you see.
`,
  },
  {
    slug: "yes-queue",
    title: "The yes queue: nothing goes out until you approve it",
    description: "How approvals work, and why drafts wait for you.",
    body: `Every message, post or spend suggestion waits for you. This is the core of the product.

## What “yes” means

When an agent prepares a draft, it sits in your yes queue. You can edit it, approve it, or leave it. Until you approve it, nothing is posted, nothing is sent to a customer, and no budget is changed.

## What the team will not do on its own

- Send WhatsApp, email or a broadcast
- Publish a post or a Google listing update
- Change ad spend
- Place a supplier order
- Issue a refund or move money

## Pause

There is a pause switch for the whole team. Use it when you want a quiet period. You can come back and review drafts later.

## A current limit, stated plainly

Agents do not run on their own in the background yet. They prepare drafts and ideas when you work with them. The queue is there so that a suggestion cannot slip out without you.
`,
  },
  {
    slug: "business-profile",
    title: "Your business profile",
    description: "What to enter so drafts sound like your shop, not a stranger.",
    body: `Your profile is how agents learn what to call you and what you sell. The more clearly you write it, the less you will have to rewrite.

## What to include

- Your business name, as customers know it
- What you sell, in plain words
- The city or area you serve, if that matters
- A starting goal, such as faster replies or a steadier posting habit

You can change these later in Settings.

## Voice

There is a brand-voice agent on the marketing team. Even so, you are the last editor. If a draft sounds unlike you, change it before you approve it. A short note in your profile about words you never use is more useful than a long slogan.

## What the profile is not

It is not a public listing and it is not sent to other customers. It is used to write drafts for you.
`,
  },
  {
    slug: "pause-the-team",
    title: "Pausing the team",
    description: "How to stop the team when you want a quiet period.",
    body: `You can pause the whole team with one switch in the dashboard.

While the team is paused, you can still sign in, read what is already there, and change settings. New work should wait until you turn the team back on.

Pausing does not cancel your purchase. Access remains yours. It also does not delete drafts that are already in your yes queue.

If you are leaving for a while and want to be sure nothing goes out, pause first, then ignore the queue until you return. Nothing in the queue sends itself.
`,
  },
  {
    slug: "payments-and-access",
    title: "Payments and access",
    description: "How the one-time payment works, who you pay, and how access is delivered.",
    body: `The product is sold for ₹1,999 once. There is no monthly fee for that purchase, and no per-seat charge for it.

## Who you pay

The payment is taken in Indian rupees through Cashfree (with a Razorpay payment page as a backup if a payment does not go through). The charge may show as **Rizwiz Enterprises**, which is our legal name.

We accept cards, debit cards, UPI, net banking and some app wallets. We do not store your card number or UPI pin.

Visitors outside India may see a US dollar figure on the offer page. The payment is still taken in rupees.

## What you get

After a successful payment we email a sign-in code to the address you paid with. Access is digital. See [Shipping and delivery](/shipping-policy).

## If a payment did not complete

You can return to the payment page and try again if the order is still open. If money left your account and you still do not have access, write to [support@theaitimemachine.com](mailto:support@theaitimemachine.com) from the email you paid with, and include any payment reference you have.

## AI usage is separate

You connect your own AI key. Usage is billed by Anthropic, OpenAI or xAI, not by us.
`,
  },
  {
    slug: "refunds",
    title: "Refunds and cancellations",
    description: "Where the refund policy lives, and how to write to us.",
    body: `The full policy is on the [Refund and Cancellation](/refund-policy) page.

If you want to ask about a refund, email [support@theaitimemachine.com](mailto:support@theaitimemachine.com) from the address you paid with. Include the payment date and any reference you have.

Support is by email only. We do not offer phone or chat support.
`,
  },
  {
    slug: "contact-support",
    title: "How to contact support",
    description: "Support is by email only. Here is how to reach a person.",
    body: `A real person reads mail sent to [support@theaitimemachine.com](mailto:support@theaitimemachine.com).

Please write from the email you use for the product, and from the email you paid with if the question is about a payment.

## What to include

- What you were trying to do
- What you saw instead
- The time, if you know it
- A payment reference, for billing questions

Do not send your AI provider key, passwords, or card details.

We do not offer a phone support line or a chat widget. The business number on legal pages is a registered contact for Rizwiz Enterprises, not a helpdesk.

[Open the contact page](/contact).
`,
  },
];

export function helpBySlug(slug: string) {
  return helpArticles.find((item) => item.slug === slug);
}
