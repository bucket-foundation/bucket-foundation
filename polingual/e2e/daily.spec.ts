import { expect, test, type Page } from "@playwright/test";
import { mockCorpus } from "./daily-mock";

async function open(page: Page, path: string) {
  await mockCorpus(page);
  await page.goto(path);
}

async function revisit(page: Page, path: string) {
  await expect(page.getByTestId("daily-results")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("daily-learn")).toHaveAttribute("href", /\/app/);
  await page.goto(path);
  await expect(page.getByTestId("daily-results")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("daily-score")).toBeVisible();
}

test("daily set plays six words, then keeps today's result", async ({ page }) => {
  await open(page, "/play/daily-set");
  for (let n = 0; n < 6; n++) {
    const right = page.locator('[data-testid=daily-choice][data-answer=yes]');
    await expect(right).toHaveCount(1, { timeout: 60_000 });
    await right.click();
    await page.waitForTimeout(800);
  }
  await expect(page.getByTestId("daily-score")).toHaveText("6 of 6");
  await expect(page.getByTestId("reveal-entry")).toHaveCount(6);
  await revisit(page, "/play/daily-set");
});

test("mini fills every clue, then keeps today's result", async ({ page }) => {
  await open(page, "/play/mini");
  const clues = page.getByTestId("mini-clue");
  await expect(clues.first()).toBeVisible({ timeout: 60_000 });
  for (let n = 0; n < (await clues.count()); n++) {
    const answer = (await clues.nth(n).getAttribute("data-answer")) ?? "";
    await clues.nth(n).click();
    for (const ch of answer) await page.keyboard.type(ch);
  }
  await page.getByTestId("mini-check").click();
  await expect(page.getByTestId("daily-score")).toHaveText(/(\d) of \1/);
  await revisit(page, "/play/mini");
});

test("word groups solves four groups, then keeps today's result", async ({ page }) => {
  await open(page, "/play/word-groups");
  await expect(page.getByTestId("groups-tile").first()).toBeVisible({ timeout: 60_000 });
  for (let k = 0; k < 4; k++) {
    const group = await page.getByTestId("groups-tile").first().getAttribute("data-group");
    const tiles = page.locator(`[data-testid=groups-tile][data-group="${group}"]`);
    for (let n = 0; n < 4; n++) await tiles.nth(n).click();
    await page.getByTestId("groups-submit").click();
  }
  await expect(page.getByTestId("daily-score")).toHaveText("4 of 4");
  await revisit(page, "/play/word-groups");
});
