import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

test("player can open the seeded payment and mark it paid", async ({ page }) => {
  await page.goto("/home");

  // Home's "What you owe" section links straight to the payment request.
  const requestLink = page
    .getByRole("link")
    .filter({ hasText: SEED.seededPaymentTitle })
    .first();
  await expect(requestLink).toBeVisible();
  await requestLink.click();

  await expect(page).toHaveURL(/\/payments\/[^/]+/);
  await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();

  // platform.dialogs.prompt() forwards to window.prompt. Install the handler
  // BEFORE clicking so Playwright answers the dialog instead of dismissing it
  // (dismissal would cancel the mark-paid flow and fail the assertion below).
  page.once("dialog", (dialog) => dialog.accept(""));
  await page.getByRole("button", { name: /i.?ve paid/i }).click();

  // After submit the UI flips to a "waiting for admin" pending state. We
  // anchor on that — the toast auto-dismisses and would race the assertion.
  await expect(page.getByText(/waiting for admin/i)).toBeVisible();
});
