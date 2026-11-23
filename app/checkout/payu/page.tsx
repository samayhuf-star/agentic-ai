import { PayuForm } from "@/components/PayuForm";
import { payuAction } from "@/lib/payments/gateways";

export const dynamic = "force-dynamic";

export default async function PayuPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const names = ["key", "txnid", "amount", "productinfo", "firstname", "email", "phone", "surl", "furl", "udf1", "hash"];
  const fields = Object.fromEntries(names.map((name) => [name, query[name] || ""]));
  return (
    <main className="page prose">
      <h1>Opening PayU…</h1>
      <p>Your name, email, and mobile go with this payment.</p>
      <PayuForm action={payuAction()} fields={fields} />
    </main>
  );
}
