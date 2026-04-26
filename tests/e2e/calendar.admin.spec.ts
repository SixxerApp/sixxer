import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

test("admin calendar shows events from administered teams", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: /calendar/i })).toBeVisible();

  await expect(page.getByText(new RegExp(`vs ${SEED.seededMatchOpponent}`, "i"))).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(new RegExp(`@ ${SEED.seededTeamBOpponent}`, "i"))).toBeVisible();
});
