import { PageShell } from "@/components/marketing/PageShell";
import { BUSINESS } from "@/lib/business";
import { pageMeta, SITE } from "@/lib/site";

export const metadata = pageMeta(
  "Careers",
  "AI Time Machine is a small team at Rizwiz Enterprises. We are not hiring for a named role right now. You can still introduce yourself by email.",
  "/careers",
);

export default function CareersPage() {
  return (
    <PageShell crumbs={[{ name: "Careers", path: "/careers" }]}>
      <p className="mk-kicker">Careers</p>
      <h1>Work with us</h1>
      <p className="mk-lead">
        AI Time Machine is built by a small team at {SITE.legalName} in Delhi. We keep this page honest: we are not hiring for a named, open role right now.
      </p>
      <div className="mk-prose" style={{ marginTop: 28 }}>
        <h2>No open roles today</h2>
        <p>
          When a role is open, we will list the title, the kind of work, and how to apply on this page. We will not invent vacancies to look busy.
        </p>
        <h2>If you still want to say hello</h2>
        <p>
          If you care about careful software for small businesses — drafts that wait for a yes, plain language, and no shortcuts on trust — you can introduce yourself. Write to{" "}
          <a href={`mailto:${BUSINESS.supportEmail}?subject=Careers`}>{BUSINESS.supportEmail}</a> with the subject line “Careers”, a little about you, and a link to work you are proud of.
        </p>
        <p>We read every note. We cannot reply in detail to each one, and a note is not an application to a role that does not exist yet.</p>
      </div>
    </PageShell>
  );
}
