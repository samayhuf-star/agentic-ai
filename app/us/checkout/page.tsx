import { UsCheckoutForm } from "@/components/UsCheckoutForm";
import { UsFooter, UsHeader } from "@/components/UsChrome";
import { pageMeta } from "@/lib/site";
import { missingStripeEnv, usPriceLabel } from "@/lib/us";

export const dynamic = "force-dynamic";

export const metadata = pageMeta(
  "Checkout — $49.99 lifetime",
  "Pay $49.99 once for lifetime access to AI Time Machine. Stripe takes the payment. You get a sign-in code by email.",
  "/us/checkout",
);

export default async function UsCheckoutPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const { canceled } = await searchParams;
  const price = usPriceLabel();
  const stripeReady = missingStripeEnv().length === 0;
  return (
    <>
      <UsHeader />
      <main className="wrap onboard checkout us-page">
        <p className="br-kicker">US lifetime access</p>
        <h1>Pay {price} once</h1>
        <p className="lead">We use this to email your sign-in code and open your team. Stripe takes the payment on the next page. There is no monthly fee for this purchase.</p>
        {canceled ? <p className="field-error">Checkout was canceled. You can try again when you are ready. No money was taken.</p> : null}
        {!stripeReady ? <p className="field-error">Card checkout is not open yet. Please write to support@theaitimemachine.com if you need help.</p> : null}
        <UsCheckoutForm price={price} />
        <p className="payee-note">Payment is processed by Stripe and may show as Rizwiz Enterprises, the company behind AI Time Machine.</p>
      </main>
      <UsFooter />
    </>
  );
}
