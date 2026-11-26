import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { BUSINESS } from "@/lib/business";
import { pageMeta, SITE } from "@/lib/site";

export const metadata = pageMeta(
  "About",
  "AI Time Machine is made by Rizwiz Enterprises in Delhi. Founded by Samay Vashsht. Your AI team drafts. You decide.",
  "/about",
);

export default function AboutPage() {
  return (
    <PageShell crumbs={[{ name: "About", path: "/about" }]}>
      <p className="mk-kicker">Company</p>
      <h1>A small company, building a careful product</h1>
      <p className="mk-lead">
        {SITE.legalName} makes AI Time Machine, a one-time software tool for business owners. The idea is simple: agents draft, you decide, and nothing goes out until you say yes.
      </p>

      <div className="mk-split">
        <div className="mk-prose">
          <h2>Mission</h2>
          <p>
            We want an owner to have a useful AI team without giving up control. Drafts, reminders and plans should be easy to ask for. Sending a message, publishing a post, or spending money should still take a clear yes.
          </p>
          <p>
            We do not promise sales, rankings, or health results. We do not replace an accountant, a lawyer, or a doctor. The product is software that helps you prepare work, then waits.
          </p>
          <h2>Story</h2>
          <p>
            AI Time Machine started from a practical problem: most small businesses can use help with everyday writing and follow-up, but they cannot risk a tool that talks to customers on its own. The 55 agents are grouped into eight teams — marketing, support, sales, content, SEO, operations, money, and a small CEO office — so the work is easier to find.
          </p>
          <p>
            The offer, the one-time price, and how buying works are on the <Link href="/55-ai-agents">55 agents page</Link>. You connect your own AI key for AI tasks. Usage is billed by that provider. Agents do not run on their own in the background yet.
          </p>
          <h2>Leadership</h2>
          <div className="mk-person">
            <div className="mk-avatar" aria-hidden="true">SV</div>
            <div>
              <h3 style={{ margin: 0 }}>{SITE.founder}</h3>
              <p style={{ margin: "4px 0 0" }}>{SITE.founderRole}, {SITE.legalName}</p>
            </div>
          </div>
          <p>
            Samay started Rizwiz Enterprises in Delhi and built AI Time Machine for owners who want help, and also want the last word. For press, see the <Link href="/press">media kit</Link>. For work enquiries, see <Link href="/careers">careers</Link>.
          </p>
        </div>
        <aside className="mk-aside">
          <h2>Registered details</h2>
          <p>
            <b>{BUSINESS.legalName}</b>
            <br />
            {BUSINESS.address}
            <br />
            Delhi 110032, India
          </p>
          <p>
            Support is by email only: <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
          </p>
          <p>Registered business number: {BUSINESS.phone}. This is not a support helpline.</p>
          <p>
            <Link href="/security">Security & trust</Link>
            <br />
            <Link href="/legal">Legal</Link>
            <br />
            <Link href="/contact">Contact</Link>
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
