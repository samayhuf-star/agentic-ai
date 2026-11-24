import { cookies, headers } from "next/headers";

export type PreviewLayout = "a" | "b" | "c";

export function parsePreviewLayout(value: string | null | undefined): PreviewLayout | null {
  return value === "a" || value === "b" || value === "c" ? value : null;
}

export async function previewLayout(): Promise<PreviewLayout | null> {
  const header = parsePreviewLayout((await headers()).get("x-atm-layout"));
  if (header) return header;
  return parsePreviewLayout((await cookies()).get("atm_layout")?.value);
}
