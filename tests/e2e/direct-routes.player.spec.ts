import { expect, type Page, test } from "@playwright/test";
import { SEED } from "./fixtures";

async function delayOnce(page: Page, urlPart: string) {
  let delayed = false;
  await page.route(`**${urlPart}**`, async (route) => {
    if (!delayed) {
      delayed = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await route.continue();
  });
}

test("direct team events route shows a team skeleton before content", async ({ page }) => {
  await page.goto("/home");
  const teamHref = await page
    .getByRole("link", {
      name: new RegExp(`${SEED.teamA.name}\\s+${SEED.club}\\s+Open`, "i"),
    })
    .first()
    .getAttribute("href");
  if (!teamHref) throw new Error("Could not find seeded team link");

  await delayOnce(page, "/rest/v1/teams");
  await page.goto(`${teamHref}/events`);

  await expect(page.getByRole("status", { name: "Loading team" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Events", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("link")
      .filter({ hasText: new RegExp(`vs ${SEED.seededMatchOpponent}`, "i") })
      .first(),
  ).toBeVisible();
});

test("direct payment route shows a payment skeleton before content", async ({ page }) => {
  await page.goto("/home");
  const paymentHref = await page
    .getByRole("link")
    .filter({ hasText: SEED.seededPaymentTitle })
    .first()
    .getAttribute("href");
  if (!paymentHref) throw new Error("Could not find seeded payment link");

  await delayOnce(page, "/rest/v1/payment_requests");
  await page.goto(paymentHref);

  await expect(page.getByRole("status", { name: "Loading payment" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();
});

test("direct calendar route shows a calendar skeleton before events", async ({ page }) => {
  await delayOnce(page, "/rest/v1/team_members");
  await page.goto("/calendar");

  await expect(page.getByRole("status", { name: "Loading calendar" })).toBeVisible();
  await expect(page.getByText(new RegExp(`vs ${SEED.seededMatchOpponent}`, "i"))).toBeVisible();
});

test("direct notifications route shows a notifications skeleton before content", async ({
  page,
}) => {
  await delayOnce(page, "/rest/v1/notifications");
  await page.goto("/notifications");

  await expect(page.getByRole("status", { name: "Loading notifications" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect(
    page.getByText("All caught up").or(page.getByRole("listitem").first()),
  ).toBeVisible();
});
