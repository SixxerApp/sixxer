import { expect, test } from "@playwright/test";
import { SEED } from "./fixtures";

test("admin can create a targeted payment from a saved template and export status", async ({
  page,
}) => {
  const title = `E2E Kit Fee ${Date.now()}`;

  await page.goto("/home");
  await page
    .getByRole("link", {
      name: new RegExp(`${SEED.teamA.name}\\s+${SEED.club}\\s+Open`, "i"),
    })
    .click();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Payments", exact: true }).click();
  const teamId = new URL(page.url()).pathname.match(/\/groups\/([^/]+)\/payments/)?.[1];
  if (!teamId) throw new Error("Could not read team id from payments URL");

  await page.getByRole("link", { name: /new payment request/i }).click();
  await expect(page.getByRole("heading", { name: "New payment request" })).toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Category").selectOption("kit");
  await page.getByLabel("Amount").fill("24.50");
  await page.getByLabel("Notes").fill("E2E kit payment.");
  await page.getByLabel("Save as reusable template").check();
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByLabel(SEED.teamA.player.name).check();
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page).toHaveURL(/\/payments\/[^/]+/);
  await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();
  await expect(page.getByText("Kit ·")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recipients" })).toBeVisible();
  await expect(page.getByText(SEED.teamA.player.name)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/e2e-kit-fee-.*-payments\.csv/);

  await page.goto(`/payments/new?teamId=${teamId}`);
  await expect(page.getByLabel("Template")).toContainText(title);
  await page.getByLabel("Template").selectOption({ index: 1 });
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await expect(page.getByLabel("Category")).toHaveValue("kit");
  await expect(page.getByLabel("Amount")).toHaveValue("24.50");
});
