import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Disclaimer · AI Time Machine" };

export default function DisclaimerPage() {
  return (
    <PolicyFrame title="Disclaimer">
      <p>
        AI Time Machine is software from {BUSINESS.legalName}. It helps you draft and organise work. It does not guarantee customers, revenue, ad results, search rankings, or any other business outcome.
      </p>
      <p>
        It is not medical advice. It does not diagnose, treat, cure, or prevent any condition. It is not a substitute for a doctor, lawyer, or accountant. You decide what to approve.
      </p>
      <p>Example screens on the website are examples. They are not a promise of your results.</p>
      <p>Questions: {BUSINESS.supportEmail}.</p>
    </PolicyFrame>
  );
}
