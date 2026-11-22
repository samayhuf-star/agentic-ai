import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page prose">
      <h1>That page is not here.</h1>
      <p>
        <Link href="/">Back to Boardroom</Link>
      </p>
    </main>
  );
}
