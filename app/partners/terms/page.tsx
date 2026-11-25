import { MinimalFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata = { title: "Partner terms · AI Time Machine" };

export default function PartnerTermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap policy prose">
        <h1>Partner terms</h1>
        <p>
          These terms cover the AI Time Machine partner program for creators.
        </p>
        <h2>Joining</h2>
        <p>
          We review every application. We may approve, decline, pause or end a
          partnership at any time. Your link only tracks after you are approved.
        </p>
        <h2>How sales are counted</h2>
        <p>
          A sale counts when a buyer opens your link and pays within 30 days. If
          they open another partner&apos;s link later, the last link wins. Your
          own purchases, test payments and refunded payments do not earn
          commission.
        </p>
        <h2>Commission and payouts</h2>
        <p>
          Your rate is shown on your dashboard. New sales show as pending, then
          confirmed after our checks and the refund window. We pay confirmed
          commission to the UPI or bank account you give us. If a paid sale is
          refunded later, we deduct that commission from your next payout.
        </p>
        <h2>Your content</h2>
        <p>
          Be honest about what the product does. Label your posts as paid or
          affiliate content as required by Indian advertising rules (for example
          #ad or #affiliate). Do not spam, buy fake clicks, bid on our brand
          name in ads, or pretend to be us. Numbers you report for your posts
          must be real; we may ask for screenshots.
        </p>
        <h2>Your data</h2>
        <p>
          We keep your contact and payout details to run the program and pay
          you. Payout details are stored encrypted. Your dashboard link is
          private: keep it to yourself. Tell us if it leaks and we will issue a
          new one.
        </p>
      </main>
      <MinimalFooter />
    </>
  );
}
