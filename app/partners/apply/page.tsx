import { ApplyForm } from "@/components/affiliates/ApplyForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "../../affiliates.css";
import "../../sup-admin/admin.css";

export const metadata = {
  title: "Become a partner · AI Time Machine",
  description: "Creators: share AI Time Machine with your followers and earn a commission on every sale.",
};

export default function ApplyPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap page apply-page adm">
        <p className="kicker">Partner program</p>
        <h1>Earn with AI Time Machine</h1>
        <p className="lead">
          Make content about AI Time Machine on Instagram or TikTok. Every sale through your link earns you a commission. You get a private dashboard with your clicks,
          sales and payouts.
        </p>
        <ul className="apply-points">
          <li>Your own link and a separate link for each post, so you see which post sold</li>
          <li>Commission on every paid sale through your link (30-day tracking)</li>
          <li>Payouts to your UPI or bank account</li>
        </ul>
        <ApplyForm />
      </main>
      <SiteFooter />
    </>
  );
}
