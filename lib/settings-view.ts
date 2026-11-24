export type SavePhase = "idle" | "saving" | "saved" | "error";

export function saveButtonState(dirty: boolean, phase: SavePhase) {
  if (phase === "saving") return { label: "Saving…", disabled: true };
  if (phase === "error") return { label: "Could not save", disabled: false };
  if (!dirty && phase === "saved") return { label: "Saved", disabled: true };
  if (!dirty) return { label: "Save changes", disabled: true };
  return { label: "Save changes", disabled: false };
}
