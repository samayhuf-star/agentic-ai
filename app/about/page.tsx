import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "About · AI Time Machine" };

export default function AboutPage() {
  return (
    <PolicyFrame title="About">
      <p>
        {BUSINESS.legalName} makes AI Time Machine, a one-time software tool for business owners. It lives at {BUSINESS.domain}.
      </p>
      <p>
        The idea is simple. You can ask for drafts and reminders. You say yes before anything goes out, and you can pause everything. The product does not promise sales, rankings, or health results.
      </p>
      <p>
        The 55-agent offer, the price, and how buying works are on the <a href="/55-ai-agents">55 agents page</a>.
      </p>
      <p>
        Registered details: {BUSINESS.legalName}, {BUSINESS.address}. Business number {BUSINESS.phone}. Support is by email only: {BUSINESS.supportEmail}.
      </p>
    </PolicyFrame>
  );
}
