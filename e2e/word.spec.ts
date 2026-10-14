import { expect, test } from "@playwright/test";
import { B } from "./base";

test.use({ viewport: { width: 390, height: 844 } });

test("hesed word study shows script, type chip and concordance", async ({ page }) => {
  await page.goto(`${B}/word/?id=H2617A`);
  const headword = page.locator("h1 [lang=he]");
  await expect(headword).toHaveText("חֶ֫סֶד");
  await expect(headword).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("Lexical fact").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "shame (H2617B)" })).toHaveAttribute("href", `${B}/word/?id=H2617B`);

  await page.getByText("Where it appears").click();
  const rows = page.locator("[data-concordance-row]");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first().locator("a").first()).toHaveAttribute("href", /\/verse\/\?ref=/);

  await expect(page.locator("[data-root-tree]")).toBeVisible();
  const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noScroll).toBe(true);
});

test("agape word study", async ({ page }) => {
  await page.goto(`${B}/word/?id=G0026`);
  await expect(page.locator("h1 [lang=grc]")).toHaveText("ἀγάπη");
  await expect(page.locator("header").getByText("116 occurrences")).toBeVisible();
});

test("unknown word id shows guidance", async ({ page }) => {
  await page.goto(`${B}/word/?id=H99999`);
  await expect(page.getByText(/couldn't find that word/)).toBeVisible();
});

test("a Strong's number without a sense letter offers its senses", async ({ page }) => {
  await page.goto(`${B}/word/?id=H2617`);
  await expect(page).toHaveURL(/\/search\/\?q=H2617/);
  await expect(page.locator(`a[href="${B}/word/?id=H2617A"]`).first()).toBeVisible();
});
