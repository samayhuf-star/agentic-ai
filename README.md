# AI Time Machine

AI Time Machine is a one-time tool for a non-technical founder. A CEO agent picks a starting team from 55 agents. Nothing is posted, sent to a customer, or paid for until you tap yes.

The price on the home page is **₹1,999 once** (shown as **$24** outside India, still charged in rupees). There is no monthly fee in the product.

## Try it on your computer

You need Node.js 20 or newer. You do not need to install Postgres for a local try.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

`npm run dev` starts a small database on this computer, loads the 55 agents, and opens the site. No payment or email account is required.

### What you can click without real keys

1. Tap any **Get AI Time Machine** button. You land on `/checkout`.
2. Enter a name, email, and Indian mobile number, then pay. No money moves.
3. The next page says the payment was received. The one-time code is on that page and in the terminal, because email is not connected yet.
4. Type the code. The dashboard opens with the 55-agent team already set up.

To open the product and the admin page, put your email in `ADMIN_EMAILS` in `.env`, restart, and sign in with that email at http://localhost:3000/login. No payment is required for those addresses. The first sign-in creates the account.

## Put it on Railway

The site is set up for [Railway](https://railway.app). On each start it runs `prisma migrate deploy` (that creates the tables and the 55 agents) and then `next start` on Railway's `PORT`. A health check is at `/api/health`.

You only need three variables for the first deploy. Everything else stays in test mode until you paste a key.

1. Push this project to GitHub.
2. On Railway, choose **New project** → **Deploy from GitHub repo** and pick this repo.
3. In the same project, choose **New** → **Database** → **PostgreSQL**. Railway fills in `DATABASE_URL` for the app. Do not type that URL yourself.
4. On the app service, open **Variables** and add:
   - `APP_URL` = the public address Railway gives you (or `https://adiology.io` once the domain is connected)
   - `AUTH_SECRET` = a long random string
5. Deploy. Railway builds with Nixpacks and starts with `npm run start:railway`.
6. Open the Railway URL. Buy still uses the test checkout until payment keys are set. The welcome link is shown on the page after the test payment, and the one-time code is shown on the sign-in page, until text and email keys are added.

Point a custom domain at the Railway service when you are ready, and set `APP_URL` to that domain.

Set the Cashfree webhook to:

`https://YOURDOMAIN/api/webhooks/cashfree`

Razorpay webhook (event `payment.captured`):

`https://YOURDOMAIN/api/webhooks/razorpay`

## What is real, and what is a stand-in

| Piece | Without keys | With keys |
| --- | --- | --- |
| Database | Temporary Postgres on your computer | Railway Postgres (`DATABASE_URL` from the plugin) |
| Payment | Test checkout page. No money moves. | Cashfree order, or Razorpay / PayU if you switch them on in Admin |
| Text / WhatsApp | Printed in the terminal | MSG91 or Gupshup |
| Email and one-time code | Shown on screen and in the terminal | Resend |
| Talk to an agent | Built-in demo replies | Your language model, if `LLM_API_KEY` is set |
| Home page videos and GIFs | Animated stand-ins | Drop files in `public/videos` and `public/assets` |

Buy buttons open `/checkout` on this site. The buyer enters their name, email, and Indian mobile number. That is what Cashfree receives, and it is what we store on the order. After payment, Cashfree returns to `/payment/success`. We confirm the order, open the account, build the 55-agent team, and email a sign-in code. The same page accepts the code. `/sup-admin` can fulfil a paid order again and resend the code.

Outside accounts (Instagram, ads, WhatsApp to customers) are not connected. Saying yes records the decision. It does not publish a post or spend money.

## Keys the owner needs

Copy `.env.example` to `.env`. Leave a line blank to keep that part in test mode.

| Key | Where to get it |
| --- | --- |
| `DATABASE_URL` | Your Postgres host. Leave the sample value to use the local database. |
| `APP_URL` | The public site address, like `https://adiology.io`. Used in text and email links. |
| `AUTH_SECRET` | Make up a long random string. It locks the sign-in codes. |
| `ADMIN_EMAILS` | Comma-separated owner emails. They can sign in without a payment, use the dashboard, and open `/sup-admin`. |
| `PRICE_INR` | Price charged, in rupees. Default `1999`. |
| `PRICE_USD` | Price shown outside India. Default `24`. The charge is still `PRICE_INR`. |
| `COMPARE_PRICE_INR` / `COMPARE_PRICE_USD` | The crossed-out launch price. Defaults `4999` and `60`. |
| `LAUNCH_OFFER_ENDS` | When the launch price ends. Default `2026-12-31T23:59:59+05:30`. |
| `CHECKOUT_URL` | Optional. A Cashfree payment-form link used only when the Cashfree API keys are empty. |
| `PAYMENT_GATEWAY` | `cashfree`, `razorpay`, or `payu`. Change it later at `/sup-admin`. |
| `CASHFREE_APP_ID` | Cashfree merchant dashboard → API keys. When this and the secret are set, checkout is real, not a test page. |
| `CASHFREE_SECRET_KEY` | Same place. Also used to check the webhook. |
| `CASHFREE_ENV` | `TEST` for sandbox.cashfree.com. `PROD` for api.cashfree.com. |
| `RAZORPAY_KEY_ID` | Razorpay dashboard → API keys. Backup gateway. |
| `RAZORPAY_KEY_SECRET` | Same place. |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret. |
| `PAYU_MERCHANT_KEY` | PayU dashboard. Backup gateway. |
| `PAYU_SALT` | PayU salt. |
| `PAYU_ENV` | `test` or `production`. |
| `SMS_PROVIDER` | `mock`, `msg91`, or `gupshup`. |
| `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID` | MSG91. The template should print the message text. |
| `GUPSHUP_API_KEY`, `GUPSHUP_SOURCE`, `GUPSHUP_APP_NAME` | Gupshup WhatsApp. |
| `RESEND_API_KEY` | [resend.com](https://resend.com). Sends the code and the welcome email. Leave blank and email stays in test mode. |
| `RESEND_FROM` | Sender Resend has verified. Default `AI Time Machine <no-reply@adiology.io>`. Replies go to support@theaitimemachine.com. `/sup-admin` can send a test email. |
| `OWNER_ALERT_EMAILS` | Comma-separated emails that get checkout, payment, and first-login alerts. |
| `WHATSAPP_PROVIDER` | `none`, `callmebot`, or `meta`. `none` only writes a log. |
| `OWNER_WHATSAPP_NUMBER` | Owner WhatsApp number with country code. |
| `CALLMEBOT_API_KEY` | Used when `WHATSAPP_PROVIDER=callmebot`. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Used when `WHATSAPP_PROVIDER=meta`. |
| `CRON_SECRET` | Shared secret for `POST /api/jobs/followups`. Send it as `x-cron-secret`. |

## Follow-up cron

The web service stays running. Add a second Railway service from this same repo for the timer. Do not put a cron schedule on the web service.

1. New service, same GitHub repo and branch.
2. Set its start command to `curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "$APP_URL/api/jobs/followups"`.
3. Set the cron schedule to `*/15 * * * *`.
4. Give that service `CRON_SECRET` and `APP_URL` (the public https address, including `www`).
5. The web service also needs `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, and `OWNER_ALERT_EMAILS`.

The job sends at most one note per person each run. Paying stops the checkout notes. Unsubscribe stops the rest. Sign-in codes still send.
| `LLM_API_KEY` | Optional. Any chat API that speaks the OpenAI format. |
| `LLM_BASE_URL` | Optional. Default `https://api.openai.com/v1`. |
| `LLM_MODEL` | Optional. Default `gpt-4o-mini`. |
| `MOCK_WEBHOOK_SECRET` | Only for test payments. Ignored once a real gateway secret is set. |

Cashfree must allow your domain before their checkout script will open. Do that in the Cashfree dashboard.

## Videos and GIFs

The 55 agents page (`/55-ai-agents`) already animates. To replace a slot, add the file and reload:

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

Support mail is support@theaitimemachine.com. The seller is Rizwiz Enterprises, 261 A Bhim Street, Vishwas Nagar, Delhi, India, +91 99537 10111.

Public routes: `/`, `/55-ai-agents`, `/pricing`, `/about`, `/contact`, `/privacy`, `/terms`, `/refund-policy`, `/shipping-policy`, `/disclaimer`, `/cookie-policy`, `/login`, `/dashboard`, `/sup-admin`. `/admin` redirects to `/sup-admin`.
