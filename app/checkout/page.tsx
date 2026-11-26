import { CheckoutForm } from "@/components/CheckoutForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { formatInr, pricing } from "@/lib/config";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout · AI Time Machine" };

export default function CheckoutPage() {
  const price = formatInr(pricing().inr);
  return (
    <>
      <SiteHeader />
      <main className="wrap onboard checkout">
        <InAppBrowserNotice />
        <p className="br-kicker">One payment</p>
        <h1>Pay {price}</h1>
        <p className="lead">We use this to send your sign-in code and open your team. Cashfree takes the payment on the next page.</p>
        <p className="pay-ways">Pay with any UPI app, UPI ID, QR code, card, net banking or wallet.</p>
        <CheckoutForm price={price} />
        <p className="payee-note">Payment goes to Rizwiz Enterprises, the company behind AI Time Machine. You will see that name on the payment page and in your UPI app.</p>
      </main>
      <SiteFooter />
    </>
  );
}
