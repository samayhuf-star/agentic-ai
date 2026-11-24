"use client";

import { saveButtonState, type SavePhase } from "@/lib/settings-view";

export function SaveChangesButton({ dirty, phase }: { dirty: boolean; phase: SavePhase }) {
  const state = saveButtonState(dirty, phase);
  return (
    <button className="btn btn-p save-changes" type="submit" disabled={state.disabled}>
      {state.label}
    </button>
  );
}
