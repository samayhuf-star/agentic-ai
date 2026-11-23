import { PolicyFrame } from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Cookie Policy · AI Time Machine" };

export default function CookiePolicyPage() {
  return (
    <PolicyFrame title="Cookie Policy">
      <p>AI Time Machine uses one essential cookie so you can stay signed in. The cookie name is ai_time_machine_session. It is stored on your browser, marked so scripts on the page cannot read it, and it expires after 30 days.</p>
      <p>We use it only to know that you signed in. We do not use it to sell ads. We do not sell cookie data.</p>
      <p>If you clear the cookie, you sign in again with your email and a one-time code. The site still works.</p>
      <p>Questions about this cookie: {BUSINESS.supportEmail}.</p>
    </PolicyFrame>
  );
}