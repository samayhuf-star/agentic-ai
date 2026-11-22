import { CashfreeHandoff } from "@/components/CashfreeHandoff";

export const dynamic = "force-dynamic";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ session?: string; mode?: string }> }) {
  const { session, mode } = await searchParams;
  if (!session) {
    return (
      <main className="page prose">
        <h1>Checkout did not open</h1>
        <p>Go back and tap Buy again.</p>
      </main>
    );
  }
  return <CashfreeHandoff sessionId={session} mode={mode === "production" ? "production" : "sandbox"} />;
}
