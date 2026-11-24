export const PREVIEW_LAYOUTS = ["a", "b", "c"] as const;
export type PreviewLayout = (typeof PREVIEW_LAYOUTS)[number];

export const PREVIEW_LAYOUT_COOKIE = "preview_layout";
export const PREVIEW_LAYOUT_HEADER = "x-preview-layout";

export function parsePreviewLayout(value: string | null | undefined): PreviewLayout | null {
  return value === "a" || value === "b" || value === "c" ? value : null;
}
