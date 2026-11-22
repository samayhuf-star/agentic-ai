"use client";

import { useEffect } from "react";

export function PayuForm({ action, fields }: { action: string; fields: Record<string, string> }) {
  useEffect(() => {
    (document.getElementById("payu") as HTMLFormElement | null)?.submit();
  }, []);

  return (
    <form id="payu" action={action} method="post">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button className="btn btn-p" type="submit">
        Continue to PayU
      </button>
    </form>
  );
}
