import { expect, test, type Page } from "@playwright/test";

async function pasteInto(page: Page, label: string, text: string) {
  const box = page.getByLabel(label);
  await box.focus();
  await page.evaluate(async (value) => {
    await navigator.clipboard.writeText(value);
  }, text);
  await page.keyboard.press("Control+V");
}

async function digitValues(page: Page) {
  return page.locator(".otp-entry input").evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value));
}

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`paste a code into the first and third boxes on ${viewport.name}`, async ({ page, context }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.route("**/api/auth/request-code", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Code sent. Check your inbox." }),
      }),
    );
    await page.route("**/api/auth/verify-code", () => new Promise(() => {}));
    await page.goto("/login");
    await page.getByLabel("Email").fill("owner@example.com");
    await page.getByRole("button", { name: "Email me a code" }).click();
    const submit = page.getByRole("button", { name: "Sign in" });
    await expect(submit).toBeDisabled();

    await pasteInto(page, "Digit 1", "123 456");
    await expect(submit).toBeEnabled();
    await expect.poll(() => digitValues(page)).toEqual(["1", "2", "3", "4", "5", "6"]);
    await page.screenshot({ path: `/opt/cursor/artifacts/otp-paste-${viewport.name}-box1.png`, fullPage: true });

    for (let index = 6; index >= 1; index -= 1) {
      await page.getByLabel(`Digit ${index}`).focus();
      await page.keyboard.press("Backspace");
    }
    await expect(submit).toBeDisabled();

    await pasteInto(page, "Digit 3", "123-456");
    await expect(submit).toBeEnabled();
    await expect.poll(() => digitValues(page)).toEqual(["1", "2", "3", "4", "5", "6"]);
    await page.screenshot({ path: `/opt/cursor/artifacts/otp-paste-${viewport.name}-box3.png`, fullPage: true });
  });
}
