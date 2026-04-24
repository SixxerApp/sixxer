import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

// Admin isn't added as a team member by the seed (that's the intended model —
// admins manage a club, they don't automatically join every team), so the
// "Next 7 days" section on the admin's home is empty. Assert on the player
// home instead, where player1 is a Team A member and should see the seeded
// match within the upcoming week.
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
