import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

const tooltipTitle = (page: Page) =>
  page.evaluate(() => {
    const el = Array.from(document.querySelectorAll<HTMLElement>("div")).find((d) => d.style.minWidth === "140px");
    return el?.firstElementChild?.textContent?.trim() ?? null;
  });

async function markerCandidates(page: Page): Promise<{ x: number; y: number }[]> {
  const shot = (await page.screenshot()).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < c.height; y += 3) {
      for (let x = 0; x < c.width * 0.68; x += 3) {
        const i = (y * c.width + x) * 4;
        const max = Math.max(data[i], data[i + 1], data[i + 2]);
        const min = Math.min(data[i], data[i + 1], data[i + 2]);
        if (max - min > 70 && max < 230) out.push({ x, y });
      }
    }
    return out;
  }, shot);
}

async function hoverMarker(page: Page): Promise<{ x: number; y: number }> {
  const candidates = await markerCandidates(page);
  const step = Math.max(1, Math.floor(candidates.length / 600));
  for (let i = 0; i < candidates.length; i += step) {
    const { x, y } = candidates[i];
    await page.mouse.move(x, y);
    if ((await page.evaluate(() => document.body.style.cursor)) === "pointer") return { x, y };
  }
  throw new Error(`no marker under the pointer among ${candidates.length} candidates`);
}

async function selectMarker(page: Page): Promise<void> {
  const { x, y } = await hoverMarker(page);
  await expect.poll(() => tooltipTitle(page)).not.toBeNull();
  const title = (await tooltipTitle(page)) as string;
  await page.waitForTimeout(300);
  await page.mouse.click(x, y);
  await expect(page.locator("aside h2", { hasText: title }).first()).toBeVisible();
  await expect(page.getByText("Click anywhere on the globe")).toHaveCount(0);
}

for (const view of ["globe", "circle"] as const) {
  test.describe(`home explorer ${view} view`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/?view=${view}&sort=branch`);
      await expect(page.locator("canvas").first()).toBeVisible();
      await page.waitForTimeout(3000);
    });

    test("expanded click fills the detail panel", async ({ page }) => {
      await page.getByRole("button", { name: "expand to fullscreen" }).click();
      await expect(page.getByRole("button", { name: "exit fullscreen" })).toBeVisible();
      await page.waitForTimeout(1500);
      await selectMarker(page);
    });

    test("collapsed click fills the detail panel after expanding and exiting", async ({ page }) => {
      await page.getByRole("button", { name: "expand to fullscreen" }).click();
      await page.getByRole("button", { name: "exit fullscreen" }).click();
      await expect(page.getByRole("button", { name: "expand to fullscreen" })).toBeVisible();
      await page.waitForTimeout(1500);
      await page.locator("canvas").first().scrollIntoViewIfNeeded();
      await selectMarker(page);
    });
  });
}
