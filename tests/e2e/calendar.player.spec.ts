import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

test("calendar tab renders upcoming events and the subscribe card", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: /calendar/i })).toBeVisible();

  // The seeded match on Team A and the weekly nets series should both land in
  // the 30-day window. Anchor on the opponent name which is unique.
  await expect(page.getByText(new RegExp(`vs ${SEED.seededMatchOpponent}`, "i"))).toBeVisible();

  // Subscribe section prompts the user to generate an iCal URL. Before the
  // token is rotated the primary CTA reads "Enable"; once rotated it toggles
  // to "Copy URL". Either label counts as the card rendering.
  const subscribeCta = page.getByRole("button", { name: /enable|copy url/i }).first();
  await expect(subscribeCta).toBeVisible();
});
