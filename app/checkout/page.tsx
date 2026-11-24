import { CheckoutForm } from "@/components/CheckoutForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { formatInr, pricing } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout · AI Time Machine" };

export default function CheckoutPage() {
  const price = formatInr(pricing().inr);
  return (
    <>
      <SiteHeader />
      <main className="wrap onboard checkout">
        <p className="br-kicker">One payment</p>
        <h1>Pay {price}</h1>
        <p className="lead">We use this to send your sign-in code and open your team. Cashfree takes the payment on the next page.</p>
        <CheckoutForm price={price} />
      </main>
      <SiteFooter />
    </>
  );
}
