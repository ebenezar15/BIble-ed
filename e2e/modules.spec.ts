import { expect, test } from "@playwright/test";
import { B } from "./base";

test.use({ viewport: { width: 390, height: 844 } });

test("explore hub links every module", async ({ page }) => {
  await page.goto(`${B}/explore/`);
  for (const name of ["Books of the Bible", "Words of Jesus", "Parables", "Names", "Torah, worship and patterns", "Church history and theology", "The Roman world", "Ask the library"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
});

test("a parable page shows typed, sourced blocks", async ({ page }) => {
  await page.goto(`${B}/parables/`);
  await page.locator(`main a[href^='${B}/parables/']`).first().click();
  await expect(page.locator("[data-block]").first()).toBeVisible();
  await expect(page.locator("[data-content-type]").first()).toBeVisible();
});

test("word study shows content sections and the Septuagint bridge", async ({ page }) => {
  await page.goto(`${B}/word/?id=H2617A`);
  await expect(page.getByText("Septuagint bridge")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relational reading" })).toBeVisible();
  await expect(page.getByText("AI-drafted, not yet reviewed").first()).toBeAttached();
});

test("verse page shows cross-references and the Fathers", async ({ page }) => {
  await page.goto(`${B}/verse/?ref=Jhn.3.16`);
  await expect(page.getByRole("heading", { name: /Cross-references \(\d+\)/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Church Fathers on this verse \([1-9]/ })).toBeVisible();
});

test("names: search and open a name", async ({ page }) => {
  await page.goto(`${B}/names/?q=Melchizedek`);
  await page.locator(`main a[href^='${B}/name/?id=Melchizedek']`).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Melchizedek");
  await expect(page.getByText(/Where the name appears/)).toBeVisible();
});

test("timeline filters by category", async ({ page }) => {
  await page.goto(`${B}/history/timeline/`);
  const council = page.getByRole("button", { name: "council", exact: true });
  await council.click();
  await expect(council).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Nicaea/).first()).toBeVisible();
});

test("notes: add on a verse, see it in My notes, delete it", async ({ page }) => {
  await page.goto(`${B}/verse/?ref=Rom.8.15`);
  const text = `Spirit of adoption test note ${Date.now()}`;
  await page.getByRole("textbox", { name: "New note" }).fill(text);
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText(text)).toBeVisible();
  await page.goto(`${B}/notes/`);
  const item = page.locator("li", { hasText: text });
  await expect(item).toBeVisible();
  await item.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(text)).toHaveCount(0);
});

test("editor: add a block with a citation and mark it checked", async ({ page }) => {
  await page.goto(`${B}/edit/?subject=verse:Phm.1.25`);
  const body = `Owner lens test ${Date.now()}`;
  const form = page.locator("section", { hasText: "Add a block" });
  await form.getByRole("textbox", { name: /Text/ }).fill(body);
  await form.getByRole("button", { name: "Add block" }).click();
  const card = page.locator("li", { hasText: "Yours" }).filter({ has: page.locator(`textarea:text-is("${body}")`) });
  await expect(card).toBeVisible();
  await card.getByRole("textbox", { name: "Reference" }).fill("Gal 4:6");
  await card.getByRole("button", { name: "Add citation" }).click();
  await card.getByRole("button", { name: "Mark as checked" }).click();
  await expect(card.getByRole("button", { name: /Checked/ })).toBeVisible();
  await page.goto(`${B}/verse/?ref=Phm.1.25`);
  await expect(page.getByText(body)).toBeVisible();
  await expect(page.getByText("Checked").first()).toBeVisible();
  await page.goto(`${B}/edit/?subject=verse:Phm.1.25`);
  await page.locator("li", { hasText: "Yours" }).first().getByRole("button", { name: "Delete this block" }).click();
});

test("ask without an API key still shows the library sources", async ({ page }) => {
  await page.goto(`${B}/ask/`);
  await page.getByRole("textbox", { name: "Your question" }).fill("What does hesed mean?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("heading", { name: "Sources from the library" })).toBeVisible();
  await expect(page.locator("#source-1")).toBeVisible();
});

test("torah: festival wheel, tabernacle plan and a chiasm ladder", async ({ page }) => {
  await page.goto(`${B}/torah/`);
  await expect(page.getByRole("img", { name: "Festival calendar" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Tabernacle floor plan" })).toBeVisible();
  await page.goto(`${B}/torah/structure/`);
  await page.locator(`main a[href^='${B}/torah/structure/']`).first().click();
  await expect(page.locator(".ladder-rung").first()).toBeVisible();
});

test("Fathers search finds comments in the browser", async ({ page }) => {
  await page.goto(`${B}/history/fathers/?q=recapitulation`);
  await expect(page.locator("main li").first()).toBeVisible();
  await expect(page.locator("main li mark").first()).toBeVisible();
});

test("editor: hide a library block, then show it again", async ({ page }) => {
  await page.goto(`${B}/edit/?subject=entry:parable/sower`);
  const first = page.locator("main ul > li").first();
  const body = await first.getByRole("textbox", { name: /Text/ }).inputValue();
  await first.getByRole("button", { name: "Hide this block" }).click();
  await expect(page.getByRole("heading", { name: "Hidden library blocks" })).toBeVisible();
  await page.getByRole("button", { name: "Show again" }).click();
  await expect(page.locator("main ul > li").first().getByRole("textbox", { name: /Text/ })).toHaveValue(body);
});
