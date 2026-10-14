import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("explore hub links every module", async ({ page }) => {
  await page.goto("/explore");
  for (const name of ["Books of the Bible", "Words of Jesus", "Parables", "Names", "Torah, worship and patterns", "Church history and theology", "The Roman world", "Ask the library"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
});

test("a parable page shows typed, sourced blocks", async ({ page }) => {
  await page.goto("/parables");
  await page.locator("main a[href^='/parables/']").first().click();
  await expect(page.locator("[data-block]").first()).toBeVisible();
  await expect(page.locator("[data-content-type]").first()).toBeVisible();
});

test("word study shows content sections and the Septuagint bridge", async ({ page }) => {
  await page.goto("/word/H2617A");
  await expect(page.getByText("Septuagint bridge")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relational reading" })).toBeVisible();
  await expect(page.getByText("AI-drafted, not yet reviewed").first()).toBeAttached();
});

test("verse page shows cross-references and the Fathers", async ({ page }) => {
  await page.goto("/verse/Jhn.3.16");
  await expect(page.getByRole("heading", { name: /Cross-references \(\d+\)/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Church Fathers on this verse \([1-9]/ })).toBeVisible();
});

test("names: search and open a name", async ({ page }) => {
  await page.goto("/names?q=Melchizedek");
  await page.locator("main a[href^='/names/Melchizedek']").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Melchizedek");
  await expect(page.getByText(/Where the name appears/)).toBeVisible();
});

test("timeline filters by category", async ({ page }) => {
  await page.goto("/history/timeline");
  const council = page.getByRole("button", { name: "council", exact: true });
  await council.click();
  await expect(council).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Nicaea/).first()).toBeVisible();
});

test("notes: add on a verse, see it in My notes, delete it", async ({ page }) => {
  await page.goto("/verse/Rom.8.15");
  const text = `Spirit of adoption test note ${Date.now()}`;
  await page.getByRole("textbox", { name: "New note" }).fill(text);
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText(text)).toBeVisible();
  await page.goto("/notes");
  const item = page.locator("li", { hasText: text });
  await expect(item).toBeVisible();
  await item.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(text)).toHaveCount(0);
});

test("editor: add a block with a citation and mark it checked", async ({ page }) => {
  await page.goto("/edit?subject=verse:Phm.1.25");
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
  await page.goto("/verse/Phm.1.25");
  await expect(page.getByText(body)).toBeVisible();
  await expect(page.getByText("Checked").first()).toBeVisible();
  await page.goto("/edit?subject=verse:Phm.1.25");
  await page.locator("li", { hasText: "Yours" }).first().getByRole("button", { name: "Delete this block" }).click();
});

test("ask without an API key still shows the library sources", async ({ page }) => {
  await page.goto("/ask");
  await page.getByRole("textbox", { name: "Your question" }).fill("What does hesed mean?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("heading", { name: "Sources from the library" })).toBeVisible();
  await expect(page.locator("#source-1")).toBeVisible();
});

test("torah: festival wheel, tabernacle plan and a chiasm ladder", async ({ page }) => {
  await page.goto("/torah");
  await expect(page.getByRole("img", { name: "Festival calendar" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Tabernacle floor plan" })).toBeVisible();
  await page.goto("/torah/structure");
  await page.locator("main a[href^='/torah/structure/']").first().click();
  await expect(page.locator(".ladder-rung").first()).toBeVisible();
});
