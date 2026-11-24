import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { bonusDelayMs, BONUS_KEYS } from "../lib/bonus/keys";
import { renderAllBonusEmails } from "../lib/bonus/emails";

const outDir = "/opt/cursor/artifacts/bonus-emails";
const paidAt = new Date("2026-11-24T08:44:00.000Z");

const names = [
  "01-prompt-swipe-file",
  "02-monthly-prompt-updates",
  "03-template-library",
  "04-priority-email-support",
];

async function shoot(browser: Awaited<ReturnType<typeof chromium.launch>>, html: string, file: string, width: number) {
  const page = await browser.newPage({ viewport: { width, height: 2600 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  const box = await page.locator("body > table").boundingBox();
  const height = Math.ceil(box?.height || 900);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
  await page.close();
}

async function main() {
  process.env.APP_URL = "https://www.theaitimemachine.com";
  fs.mkdirSync(outDir, { recursive: true });
  const emails = await renderAllBonusEmails({
    orderId: "cf_7k2m9qa",
    name: null,
    paidAt,
  });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    for (const [index, email] of emails.entries()) {
      const base = names[index];
      await shoot(browser, email.html, path.join(outDir, `${base}.png`), 640);
      await shoot(browser, email.html, path.join(outDir, `${base}-390.png`), 390);
      if (email.attachments[0]) {
        fs.writeFileSync(path.join(outDir, "swipe-file.pdf"), email.attachments[0].content);
      }
      const minutes = bonusDelayMs(index) / 60000;
      console.log(`${BONUS_KEYS[index]}\t${email.subject}\t+${minutes} min\t${base}.png`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
