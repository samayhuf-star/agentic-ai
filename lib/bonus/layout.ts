import { BUSINESS } from "@/lib/business";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BrandEmailInput = {
  preheader: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  callout?: string;
  after?: string[];
  action?: { href: string; label: string };
};

export function renderBrandEmail(input: BrandEmailInput) {
  const paragraphs = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#d7e0db;">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const bullets = input.bullets?.length
    ? `<ul style="margin:0 0 16px;padding:0 0 0 18px;color:#d7e0db;font-size:16px;line-height:1.55;">${input.bullets
        .map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`)
        .join("")}</ul>`
    : "";
  const after = (input.after || [])
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#d7e0db;">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const callout = input.callout
    ? `<table role="presentation" width="100%" style="margin:0 0 18px;"><tr><td style="padding:14px 16px;border-left:4px solid #c8f25a;background:#0b0f12;border-radius:12px;color:#eef2f0;font-size:15px;line-height:1.5;">${escapeHtml(input.callout)}</td></tr></table>`
    : "";
  const action = input.action
    ? `<table role="presentation" width="100%" style="margin:8px 0 8px;"><tr><td><a href="${escapeHtml(input.action.href)}" style="display:block;text-align:center;background:#c8f25a;color:#142000;text-decoration:none;font-weight:700;font-size:16px;line-height:1.3;padding:14px 16px;border-radius:12px;">${escapeHtml(input.action.label)}</a></td></tr></table>`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#06080a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" bgcolor="#06080a" style="background:#06080a;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:20px 12px 28px;">
        <table role="presentation" width="100%" style="max-width:600px;background:#10161b;border:1px solid rgba(255,255,255,0.1);border-radius:18px;">
          <tr>
            <td style="padding:28px 22px 24px;font-family:Inter,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 18px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#c8f25a;font-weight:700;">AI Time Machine</p>
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c8f25a;font-weight:700;">${escapeHtml(input.kicker)}</p>
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#eef2f0;font-weight:700;">${escapeHtml(input.title)}</h1>
              ${paragraphs}
              ${callout}
              ${after}
              ${bullets}
              ${action}
              <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:13px;line-height:1.5;color:#88928d;">
                ${escapeHtml(BUSINESS.legalName)}<br />
                ${escapeHtml(BUSINESS.address)}<br />
                <a href="mailto:${escapeHtml(BUSINESS.supportEmail)}" style="color:#c8f25a;text-decoration:none;">${escapeHtml(BUSINESS.supportEmail)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const text = [
    "AI Time Machine",
    input.kicker,
    input.title,
    "",
    ...input.paragraphs,
    "",
    input.callout || "",
    ...(input.after || []),
    ...(input.bullets || []).map((item) => `- ${item}`),
    input.action ? `${input.action.label}: ${input.action.href}` : "",
    "",
    BUSINESS.legalName,
    BUSINESS.address,
    BUSINESS.supportEmail,
  ]
    .filter((line) => line !== "")
    .join("\n");
  return { html, text };
}
