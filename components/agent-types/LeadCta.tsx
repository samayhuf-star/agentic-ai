import { AgentLeadForm } from "@/components/agent-types/AgentLeadForm";
import { GeoCta } from "@/components/agent-types/GeoCta";
import { formatInr, pricing } from "@/lib/config";
import { usPriceLabel } from "@/lib/us";

export function LeadCta({ agentName, pagePath, heading }: { agentName: string; pagePath: string; heading: string }) {
  return (
    <section className="aa-lead" id="get-help" aria-labelledby="get-help-h">
      <div className="aa-lead-form">
        <h2 id="get-help-h">{heading}</h2>
        <p>Tell us what you want the agent to do. We read every request and reply by email, usually within two business days, with an honest view of whether our ready-made agents fit or what a custom build would involve.</p>
        <AgentLeadForm agentName={agentName} pagePath={pagePath} />
      </div>
      <div className="aa-lead-buy">
        <h3>Or start today with 55 ready-made AI agents</h3>
        <p>
          AI Time Machine gives a small business 55 agents in 8 teams (sales, support, marketing, content, SEO, operations, money and a CEO office). They draft the work, you approve it, and they use the AI provider key you connect. One-time payment, no subscription.
        </p>
        <GeoCta inrLabel={formatInr(pricing().inr)} usdLabel={usPriceLabel()} source={pagePath} />
      </div>
    </section>
  );
}
