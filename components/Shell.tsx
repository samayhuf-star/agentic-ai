"use client";

import { PreviewShell } from "@/components/layout/PreviewShell";

export function Shell({
  businessName,
  paused,
  needsYes,
  isAdmin,
  children,
}: {
  businessName: string;
  paused: boolean;
  needsYes: number;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return (
    <PreviewShell businessName={businessName} paused={paused} needsYes={needsYes} isAdmin={isAdmin}>
      {children}
    </PreviewShell>
  );
}
