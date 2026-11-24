"use client";

import { AiKeyForm, type PublicKey } from "@/components/AiKeyForm";
import { BusinessProfileForm, type ProfileValues } from "@/components/BusinessProfileForm";
import { GoalEditor } from "@/components/GoalEditor";
import { usePublishDetail } from "@/components/layout/context";

export function SettingsScreen({
  goal,
  profile,
  aiKey,
}: {
  goal: string;
  profile: ProfileValues;
  aiKey: PublicKey | null;
}) {
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
    true,
  );

  return (
    <div className="settings-dense">
      <section className="settings-block">
        <h2>AI provider and key</h2>
        <AiKeyForm initial={aiKey} />
      </section>
      <section className="settings-block">
        <GoalEditor goal={goal} />
      </section>
      <section className="settings-block">
        <BusinessProfileForm initial={profile} />
      </section>
    </div>
  );
}
