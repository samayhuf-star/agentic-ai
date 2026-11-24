import { WelcomeForm } from "@/components/WelcomeForm";

export const dynamic = "force-dynamic";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="page prose">
        <h1>Link missing</h1>
        <p>Open the link from your text message. If it is lost, write to support@theaitimemachine.com.</p>
      </div>
    );
  }
  return <WelcomeForm token={token} />;
}
