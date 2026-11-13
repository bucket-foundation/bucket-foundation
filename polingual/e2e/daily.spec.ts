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
