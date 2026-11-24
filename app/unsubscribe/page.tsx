import { prisma } from "@/lib/prisma";
import { tokenMatches } from "@/lib/followups/run";
import { BUSINESS } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ id?: string; token?: string }> }) {
  const { id, token } = await searchParams;
  const ok = Boolean(id && token && tokenMatches(id, token));
  if (ok && id) {
    await prisma.lead.updateMany({ where: { id }, data: { marketingOptOut: true } });
    await prisma.user.updateMany({ where: { id }, data: { marketingOptOut: true } });
  }
  return (
    <main className="page prose">
      <h1>{ok ? "You are unsubscribed" : "Link not valid"}</h1>
      <p>
        {ok
          ? "We will not send more of these notes. Sign-in codes still arrive when you ask for them."
          : "This unsubscribe link is not valid."}
      </p>
      <p>
        {BUSINESS.legalName}
        <br />
        <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
      </p>
    </main>
  );
}
