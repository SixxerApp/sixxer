import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

// Admin creates a one-off practice event from the team hero's "+" action.
// We use a unique title per run so reruns against the same seed DB still find
// a fresh card and don't collide with leftovers from earlier sessions.
test("admin can create a one-off event and see it on the team tab", async ({ page }) => {
  const uniqueTitle = `E2E Practice ${Date.now()}`;

  await page.goto("/home");

  // The team card under "Your teams" has an accessible name of
  // "{teamName} {clubName} Open". Matching on that combination avoids
  // clicking the visually-similar "Create access for …" admin-tools link
  // lower on the page.
  await page
    .getByRole("link", {
      name: new RegExp(`${SEED.teamA.name}\\s+${SEED.club}\\s+Open`, "i"),
    })
    .click();
  await expect(page).toHaveURL(/\/groups\/[^/]+/);
  // Wait for the team layout to render — the tab bar is a stable anchor.
  await expect(page.getByRole("link", { name: "Events", exact: true })).toBeVisible();

  // The team hero has a "+" link (aria-label "Create") pointing at
  // /events/new?teamId=…
  await page.getByRole("link", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/events\/new/);
  await expect(page.getByRole("heading", { name: "New event" })).toBeVisible();

  // Default event type is "match", so the opponent field is visible. Filling
  // it — even if we give the match a title — keeps the form deterministic
  // and exercises the match-creation path end to end.
  await page.getByLabel("Opponent").fill("E2E Opponents");
  await page.getByLabel("Title", { exact: false }).fill(uniqueTitle);

  // datetime-local accepts ISO-like "YYYY-MM-DDTHH:mm". Set tomorrow 18:00.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  const localIso = toLocalDateTimeInput(tomorrow);
  await page.getByLabel("Start time", { exact: true }).fill(localIso);

  await page.getByRole("button", { name: "Create event" }).click();

  // On success the app navigates to the event detail page and toasts.
  // Anchor on the event title, which is part of the detail header.
  await expect(page).toHaveURL(/\/events\/[^/]+/);
  await expect(page.getByRole("heading", { name: uniqueTitle })).toBeVisible();
});

// datetime-local inputs expect local-wall-clock "YYYY-MM-DDTHH:mm" (no TZ),
// not toISOString which is always UTC. Using toISOString shifted the start
// time by the runner's TZ offset, producing off-by-one-day failures in CI.
function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
