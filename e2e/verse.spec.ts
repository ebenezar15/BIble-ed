import { expect, test } from "@playwright/test";
import { B } from "./base";

test.use({ viewport: { width: 390, height: 844 } });

test("John 3:16 interlinear with popover and parallel translations", async ({ page }) => {
  await page.goto(`${B}/verse/?ref=Jhn.3.16`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("John 3:16");
  const word = page.locator("[data-token]", { hasText: "ἠγάπησεν" });
  await expect(word).toBeVisible();
  await word.locator("button").first().focus();
  const pop = page.getByRole("tooltip");
  await expect(pop).toContainText("love");
  await expect(pop.getByRole("link", { name: /Open word study/ })).toHaveAttribute("href", `${B}/word/?id=G0025`);
  await expect(page.locator("[data-translation=kjv]")).toContainText("only begotten");
  await expect(page.getByRole("link", { name: "Next verse" })).toHaveAttribute("href", `${B}/verse/?ref=Jhn.3.17`);
  const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noScroll).toBe(true);
});

test("Hebrew verse is right-to-left and notes Hebrew numbering", async ({ page }) => {
  await page.goto(`${B}/verse/?ref=Mal.4.1`);
  await expect(page.locator("[data-interlinear]")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("Hebrew numbering: Malachi 3:19")).toBeVisible();
});

test("verse missing from SBLGNT is explained", async ({ page }) => {
  await page.goto(`${B}/verse/?ref=Mat.17.21`);
  await expect(page.getByText(/Not in the SBL Greek New Testament/)).toBeVisible();
  await expect(page.getByText("Contested").first()).toBeVisible();
});

test("interlinear rows can be toggled", async ({ page }) => {
  await page.goto(`${B}/verse/?ref=Gen.1.1`);
  const translit = page.locator("[data-row=translit]").first();
  await expect(translit).toBeVisible();
  await page.getByRole("checkbox", { name: "Transliteration" }).uncheck();
  await expect(translit).toBeHidden();
});

test("unknown verse shows guidance", async ({ page }) => {
  await page.goto(`${B}/verse/?ref=Jhn.30.1`);
  await expect(page.getByText(/couldn't find that verse/i)).toBeVisible();
});
