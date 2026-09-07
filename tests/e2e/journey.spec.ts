import { expect, test } from "@playwright/test";

test("investigate to evidence and paper receipt", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /You saw the profit/i })).toBeVisible();
  await page.getByRole("button", { name: "Use replay case" }).click();
  await expect(page).toHaveURL(/\/case\/echo-7/);
  await expect(page.getByRole("heading", { name: "A clean win, with a missing beginning" })).toBeVisible();
  await page.getByRole("button", { name: /Known-basis realized result/ }).click();
  await expect(page.getByRole("heading", { name: "Evidence, not assertion" })).toBeVisible();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page.getByRole("button", { name: "Preview order" }).click();
  await expect(page.getByText(/approving exactly/i)).toBeVisible();
  await page.getByRole("button", { name: "Approve paper fill" }).click();
  await expect(page.getByText("Paper fill reconciled")).toBeVisible();
  await expect(page.getByText("No funds moved. This receipt is a deterministic simulation.")).toBeVisible();
});
