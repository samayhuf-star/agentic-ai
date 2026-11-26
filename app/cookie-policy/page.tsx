import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Cookie Policy · AI Time Machine" };

export default function CookiePolicyPage() {
  return (
    <PolicyFrame title="Cookie Policy">
      <p>AI Time Machine sets a small number of first-party cookies. We do not sell cookie data.</p>
      <h2>Essential</h2>
      <p>
        <b>ai_time_machine_session</b> keeps you signed in. Scripts on the page cannot read it, and it expires after 30 days. If you clear it, you sign in again with your
        email and a one-time code.
      </p>
      <h2>Measurement (first-party)</h2>
      <p>
        <b>aitm_mt</b> remembers how you first and most recently reached us: the campaign tags in the link (such as utm_source or utm_campaign), an ad click id (gclid, fbclid or
        ttclid), the page you landed on and the site that sent you. It lasts 90 days. We use it to see which channels bring customers.
      </p>
      <p>
        <b>aitm_ref</b> is set only when you open a partner&apos;s link. It holds the partner code for 30 days, so the partner who sent you gets credit if you buy.
      </p>
      <h2>Advertising (only if switched on)</h2>
      <p>
        We may use the Meta Pixel (cookies such as _fbp and _fbc) and the Google Ads tag to measure our ads: a page view, starting checkout, and a completed purchase with its
        amount. When a purchase is confirmed we may also tell Meta about it from our server, with your email and phone number hashed (scrambled) first. These tools are off
        until we turn them on. They never run on your dashboard or account pages.
      </p>
      <p>
        On the payment success page we load Google Tag Manager (GTM-P3L723D9). After a payment is confirmed as paid, we send a purchase event with the order id and
        amount in INR. That event is not sent if the payment failed or is still pending.
      </p>
      <p>You can block or clear cookies in your browser settings. The site still works; we just can&apos;t tell which link brought you.</p>
      <p>Questions about cookies: {BUSINESS.supportEmail}.</p>
    </PolicyFrame>
  );
}
