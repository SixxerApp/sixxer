import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

test("player can RSVP Going to the seeded match", async ({ page }) => {
  await page.goto("/home");

  const matchCard = page
    .getByRole("link")
    .filter({ hasText: new RegExp(`vs ${SEED.seededMatchOpponent}`, "i") })
    .first();
  await expect(matchCard).toBeVisible();
  await matchCard.click();

  await expect(page).toHaveURL(/\/events\/[^/]+/);
  const goingButton = page.getByRole("button", { name: "Going", exact: true });
  await expect(goingButton).toBeVisible();

  // Before clicking, confirm nobody has RSVPed yet. The summary pill at the
  // bottom of the event page is driven by the server-confirmed response list,
  // so we use it as our ground-truth oracle both before and after the write.
  const summaryButton = page.getByRole("button", { name: /\d+ Going \d+ Maybe \d+ Can't/ });
  await expect(summaryButton).toHaveAccessibleName(/^0 Going 0 Maybe 0 Can't$/);

  await goingButton.click();

  // The summary can show "1 Going" from optimistic `setResponses` before the
  // Supabase upsert and refetch complete. Buttons stay disabled until
  // `load()` finishes (see `useEventDetail#rsvp`), so `toBeEnabled` gates
  // `reload()` on a persisted row, not a client-only state.
  await expect(goingButton).toBeEnabled({ timeout: 30_000 });
  await expect(summaryButton).toHaveAccessibleName(/^1 Going 0 Maybe 0 Can't$/);
  await expect(goingButton).toHaveAttribute("aria-pressed", "true");

  await page.reload();

  // After a full navigation the event page can fetch once before the Supabase
  // session is restored; RLS then returns an empty list and the "Going" tile
  // stays inactive (bg-card) even though the write exists. The app refetches
  // when the session is ready—wait for the server-driven summary, not CSS.
  const summaryAfter = page.getByRole("button", { name: /\d+ Going \d+ Maybe \d+ Can't/ });
  await expect(summaryAfter).toHaveAccessibleName(/^1 Going 0 Maybe 0 Can't$/, {
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Going", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
