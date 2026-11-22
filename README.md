# Boardroom

Boardroom is a one-time tool for a non-technical founder. A CEO agent picks a starting team from 55 agents. Nothing is posted, sent to a customer, or paid for until you tap yes.

The price on the home page is **₹1,999 once** (shown as **$24** outside India, still charged in rupees). There is no monthly fee in the product.

## Try it on your computer

You need Node.js 20 or newer. You do not need to install Postgres for a local try.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

`npm run dev` starts a small database on this computer, loads the 55 agents, and opens the site. No payment, text message, or email account is required.

### What you can click without real keys

1. Tap any **Get Boardroom** button. You land on a **test checkout**. No money moves.
2. Enter a mobile number and pay.
3. The terminal where `npm run dev` is running prints the text message. Open the link.
4. Add an email. The one-time code is shown on the page and printed in the terminal, because email is not connected yet.
5. Answer three questions. Ayaan picks a starting team.
6. Use the dashboard: team on/off, chat, Needs your yes, and Pause everything.

To open the admin page, put your email in `ADMIN_EMAILS` in `.env`, restart, and sign in with that email at http://localhost:3000/login

## Put it on the internet (Vercel)

1. Push this project to GitHub.
2. Import it on [Vercel](https://vercel.com).
3. Create a Postgres database (Neon, Supabase, or Vercel Postgres) and paste its URL as `DATABASE_URL`.
4. Paste the other keys from the list below.
5. After the first deploy, open a terminal in the project and run:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

Use the production `DATABASE_URL` when you run those two commands, so the 55 agents exist in the live database.

Set the Cashfree webhook to:

`https://YOURDOMAIN/api/webhooks/cashfree`

Razorpay webhook (event `payment.captured`):

`https://YOURDOMAIN/api/webhooks/razorpay`

## What is real, and what is a stand-in

| Piece | Without keys | With keys |
| --- | --- | --- |
| Database | Temporary Postgres on your computer | Your `DATABASE_URL` |
| Payment | Test checkout page. No money moves. | Cashfree order, or Razorpay / PayU if you switch them on in Admin |
| Text / WhatsApp | Printed in the terminal | MSG91 or Gupshup |
| Email and one-time code | Shown on screen and in the terminal | Resend |
| Talk to an agent | Built-in demo replies | Your language model, if `LLM_API_KEY` is set |
| Home page videos and GIFs | Animated stand-ins | Drop files in `public/videos` and `public/assets` |

Real checkout does **not** ask for a name or email first. The Buy button opens checkout. Cashfree's page shows a sample phone (`9999999999`). The buyer must replace it with their own mobile before paying. That number is where the login link is sent. If they leave the sample number, the payment is saved but an account is not opened, so two people never share a login.

Outside accounts (Instagram, ads, WhatsApp to customers) are not connected. Saying yes records the decision. It does not publish a post or spend money.

## Keys the owner needs

Copy `.env.example` to `.env`. Leave a line blank to keep that part in test mode.

| Key | Where to get it |
| --- | --- |
| `DATABASE_URL` | Your Postgres host. Leave the sample value to use the local database. |
| `APP_URL` | The public site address, like `https://adiology.io`. Used in text and email links. |
| `AUTH_SECRET` | Make up a long random string. It locks the sign-in codes. |
| `ADMIN_EMAILS` | Your email. Comma-separated if there are several. |
| `PRICE_INR` | Price charged, in rupees. Default `1999`. |
| `PRICE_USD` | Price shown outside India. Default `24`. The charge is still `PRICE_INR`. |
| `COMPARE_PRICE_INR` / `COMPARE_PRICE_USD` | The crossed-out launch price. Defaults `4999` and `60`. |
| `LAUNCH_OFFER_ENDS` | When the launch price ends. Default `2026-12-31T23:59:59+05:30`. |
| `CHECKOUT_URL` | Optional. A Cashfree payment-form link used only when the Cashfree API keys are empty. |
| `PAYMENT_GATEWAY` | `cashfree`, `razorpay`, or `payu`. Admin can change this later. |
| `CASHFREE_APP_ID` | Cashfree merchant dashboard → API keys. |
| `CASHFREE_SECRET_KEY` | Same place. Also used to check the webhook. |
| `CASHFREE_ENV` | `sandbox` while testing. `production` for real money. |
| `RAZORPAY_KEY_ID` | Razorpay dashboard → API keys. Backup gateway. |
| `RAZORPAY_KEY_SECRET` | Same place. |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret. |
| `PAYU_MERCHANT_KEY` | PayU dashboard. Backup gateway. |
| `PAYU_SALT` | PayU salt. |
| `PAYU_ENV` | `test` or `production`. |
| `SMS_PROVIDER` | `mock`, `msg91`, or `gupshup`. |
| `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID` | MSG91. The template should print the message text. |
| `GUPSHUP_API_KEY`, `GUPSHUP_SOURCE`, `GUPSHUP_APP_NAME` | Gupshup WhatsApp. |
| `RESEND_API_KEY` | [resend.com](https://resend.com). Sends the code and the welcome email. |
| `EMAIL_FROM` | A sender Resend has verified. Default `Boardroom <support@adiology.io>`. |
| `LLM_API_KEY` | Optional. Any chat API that speaks the OpenAI format. |
| `LLM_BASE_URL` | Optional. Default `https://api.openai.com/v1`. |
| `LLM_MODEL` | Optional. Default `gpt-4o-mini`. |
| `MOCK_WEBHOOK_SECRET` | Only for test payments. Ignored once a real gateway secret is set. |

Cashfree must allow your domain before their checkout script will open. Do that in the Cashfree dashboard.

## Videos and GIFs

The home page already animates. To replace a slot, add the file and reload:

- `public/videos/dashboard-tour.mp4`
- `public/videos/step-01.mp4` through `public/videos/step-04.mp4`
- `public/assets/dept-marketing-01.gif` (and `-02`, `-03`)
- `public/assets/dept-support-01.gif` (and `-02`, `-03`)
- `public/assets/dept-accounts-01.gif` (and `-02`, `-03`)
- `public/assets/dept-ads-01.gif` (and `-02`, `-03`)
- `public/assets/dept-seo-01.gif` (and `-02`, `-03`)

If a file is missing, the animated stand-in stays.

## Useful commands

```bash
npm run dev      # site + local database
npm test         # checks the roster and the pay → text → code path
npm run lint
npm run build
```

Privacy (`/privacy`) and terms (`/terms`) are drafts. Replace them with lawyer-approved pages before you take real payments. Support mail is support@adiology.io.
