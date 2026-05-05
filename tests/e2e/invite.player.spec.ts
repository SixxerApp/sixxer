import { expect, test } from "@playwright/test";

test("invalid invite link shows a clear error and keeps manual code fallback", async ({ page }) => {
  await page.goto("/join?code=NOTREAL");

  await expect(page.getByLabel("Invite code")).toHaveValue("NOTREAL");
  await expect(page.locator("form").getByText("Invite code not found.")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Join club" })).toBeVisible();
});
