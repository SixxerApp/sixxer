import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

test.describe("admin home", () => {
  test("dashboard loads and shows both seeded teams", async ({ page }) => {
    await page.goto("/home");
    await expect(
      page.getByRole("heading", { name: new RegExp(`Hey ${SEED.admin.name.split(" ")[0]}`, "i") }),
    ).toBeVisible();

    // Each team name appears twice on the admin home (team card + "Create
    // access for …" admin tools link). Disambiguate via the club name, which
    // is part of the team card's accessible name but not the admin tool's,
    // so we still fail loudly if the team card disappears.
    await expect(
      page.getByRole("link", {
        name: new RegExp(`${SEED.teamA.name}\\s+${SEED.club}`, "i"),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: new RegExp(`${SEED.teamB.name}\\s+${SEED.club}`, "i"),
      }),
    ).toBeVisible();
  });

  test("shows upcoming events from administered teams", async ({ page }) => {
    await page.goto("/home");

    await expect(
      page
        .getByRole("link")
        .filter({ hasText: new RegExp(`vs ${SEED.seededMatchOpponent}`, "i") })
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page
        .getByRole("link")
        .filter({ hasText: new RegExp(`@ ${SEED.seededTeamBOpponent}`, "i") })
        .first(),
    ).toBeVisible();
  });
});
