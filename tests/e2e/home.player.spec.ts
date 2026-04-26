import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

test("player home shows the seeded match in Next 7 days", async ({ page }) => {
  await page.goto("/home");

  const matchCard = page
    .getByRole("link")
    .filter({ hasText: new RegExp(`vs ${SEED.seededMatchOpponent}`, "i") })
    .first();
  await expect(matchCard).toBeVisible({ timeout: 15_000 });

  await expect(matchCard.getByText(/✓\s*\d+/)).toBeVisible();
  await expect(matchCard.getByText(/\?\s*\d+/)).toBeVisible();
  await expect(matchCard.getByText(/✗\s*\d+/)).toBeVisible();
});

test("player home excludes teams they are not on", async ({ page }) => {
  await page.goto("/home");

  await expect(page.getByText(new RegExp(`@ ${SEED.seededTeamBOpponent}`, "i"))).toHaveCount(0);
});
