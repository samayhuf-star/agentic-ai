"use client";

import { useState } from "react";
import { AiKeyForm, type PublicKey } from "@/components/AiKeyForm";
import { BusinessProfileForm, type ProfileValues } from "@/components/BusinessProfileForm";
import { GoalEditor } from "@/components/GoalEditor";
import { usePublishDetail } from "@/components/layout/context";
import type { PreviewLayout } from "@/lib/preview-layout";

const sections = [
  { id: "key", label: "AI key" },
  { id: "goal", label: "Main goal" },
  { id: "business", label: "Business" },
] as const;

export function SettingsScreen({
  layout,
  goal,
  profile,
  aiKey,
}: {
  layout: PreviewLayout;
  goal: string;
  profile: ProfileValues;
  aiKey: PublicKey | null;
}) {
  const [section, setSection] = useState<(typeof sections)[number]["id"]>("business");
  usePublishDetail(
    <div className="detail-card">
      <p className="br-kicker">Saved on the profile</p>
      <p>
        <b>Email</b>
        <br />
        {profile.email || "Not added yet"}
      </p>
      <p>
        <b>Phone</b>
        <br />
        {profile.phone || "Not added yet"}
      </p>
      <p className="muted">{profile.sells ? `Earlier note: ${profile.sells}` : "Pick a category and a business type."}</p>
    </div>,
    `${profile.email}:${profile.phone}:${profile.sells}:${profile.category}`,
    layout === "c",
  );

  const keyBlock = (
    <section className="settings-block">
      <h2>AI provider and key</h2>
      <AiKeyForm initial={aiKey} />
    </section>
  );
  const goalBlock = (
    <section className="settings-block">
      <GoalEditor goal={goal} />
    </section>
  );
  const businessBlock = (
    <section className="settings-block">
      <BusinessProfileForm initial={profile} />
    </section>
  );

  if (layout === "b") {
    return (
      <div className="split-inbox settings-split">
        <div className="split-list" role="group" aria-label="Settings sections">
          {sections.map((item) => (
            <button key={item.id} type="button" className={section === item.id ? "on" : ""} aria-pressed={section === item.id} onClick={() => setSection(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="split-detail">
          {section === "key" ? keyBlock : null}
          {section === "goal" ? goalBlock : null}
          {section === "business" ? businessBlock : null}
        </div>
      </div>
    );
  }

  return (
    <div className={layout === "c" ? "settings-dense" : "settings-cards"}>
      {keyBlock}
      {goalBlock}
      {businessBlock}
    </div>
  );
}
