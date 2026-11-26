import { CreatorApplyForm } from "@/components/creators/ApplyForm";
import { SiteHeader } from "@/components/SiteChrome";
import Link from "next/link";
import "../affiliates.css";
import "./creators.css";

export const metadata = {
  title: "Create with us · AI Time Machine",
  description: "Apply once to make videos or other content for our apps. Pick one or more apps and tell us about your work.",
};

export default function CreatorsPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap page apply-page creator-page">
        <p className="kicker">Creator applications</p>
        <h1>Create with us</h1>
        <p className="lead">
          If you make videos or other content and want to feature our apps, apply once and pick the apps you would like to work on.
          We review every application and will get in touch if there is a fit.
        </p>
        <ul className="apply-points">
          <li>One form for all of our apps — select one or as many as you like</li>
          <li>Tell us where you publish, what you make, and share a few samples</li>
          <li>Applying does not guarantee paid work, free product, or a collaboration</li>
        </ul>
        <CreatorApplyForm />
      </main>
      <footer>
        <div className="wrap foot">
          <div>
            <Link className="logo" href="/">
              <i />
              AI Time Machine
            </Link>
          </div>
          <div className="foot-r">
            <nav className="foot-policies" aria-label="Legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
            <small>© 2026 AI Time Machine</small>
          </div>
        </div>
      </footer>
    </>
  );
}
