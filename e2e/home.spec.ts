import { expect, test } from "@playwright/test";
import { B } from "./base";

test.use({ viewport: { width: 390, height: 844 } });

test("home page fits a phone and offers the ten example words", async ({ page }) => {
  await page.goto(`${B}/`);
  const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noScroll).toBe(true);
  const words = page.locator("[data-example-word]");
  await expect(words).toHaveCount(10);
  await expect(page.getByRole("link", { name: /hesed/i }).first()).toHaveAttribute("href", `${B}/word/?id=H2617A`);
});

test("searching hesed leads to the word study", async ({ page }) => {
  await page.goto(`${B}/`);
  const box = page.getByRole("combobox").last();
  await box.fill("hesed");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/search\/\?q=hesed/);
  await page.locator(`a[href="${B}/word/?id=H2617A"]`).first().click();
  await expect(page).toHaveURL(/\/word\/\?id=H2617A/);
});

test("sources page lists licences", async ({ page }) => {
  await page.goto(`${B}/sources/`);
  await expect(page.getByText("CC BY 4.0").first()).toBeVisible();
  await expect(page.getByText(/STEP Bible/).first()).toBeVisible();
  await expect(page.getByText("Public domain").first()).toBeVisible();
});

test("choosing a colour scheme persists across reloads", async ({ page }) => {
  await page.goto(`${B}/`);
  await page.getByRole("button", { name: "Theme" }).click();
  await page.locator('[data-preset-option="lapis"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-preset", "lapis");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-preset", "lapis");
});
