import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("the circle view renders the chart on the canon data", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await expect(page.getByTestId("space-view")).toBeVisible();
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByTestId("coverage-stat")).toContainText("mean coverage");
  await expect(page.getByTestId("basis-label")).toHaveCount(0);
  const chart = page.getByTestId("circle-chart");
  await expect(chart).toBeVisible();
  await expect(chart.locator("g[data-series=mean]")).toHaveAttribute("data-vertices", "12");
  await expect(chart.locator("g[data-vertices]")).toHaveCount(2);
});

test("scrolling steps through the observations", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
  const current = page.getByTestId("space-current");
  await expect(current).toContainText("1 /");
  const box = (await page.getByTestId("circle-chart").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(current).toContainText("2 /");
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -120);
  await expect(current).toContainText("1 /");
});

test("the chart has a scrubber and no rows of item buttons", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await expect(page.getByTestId("scrubber")).toBeVisible();
  await expect(page.getByTestId("scrubber-handle")).toBeVisible();
  await expect(page.locator("button[aria-pressed]")).toHaveCount(0);
  await expect(page.getByTestId("space-current")).toContainText("1 /");
});

test("dragging the handle steps the item and the label follows", async ({ page }) => {
  await page.goto("/explore?view=circle");
  const slider = page.getByRole("slider", { name: /observations/ });
  await expect(slider).toBeVisible();
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
  const box = (await slider.boundingBox())!;
  const count = Number(await page.getByTestId("scrubber").getAttribute("data-count"));
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", String(count - 1));
  await expect(page.getByTestId("space-current")).toContainText(`${count} / ${count}`);
});

test("arrow keys step the scrubber", async ({ page }) => {
  await page.goto("/explore?view=circle");
  const slider = page.getByRole("slider", { name: /observations/ });
  await expect(slider).toBeVisible();
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", "1");
  await page.keyboard.press("End");
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", String(Number(await page.getByTestId("scrubber").getAttribute("data-count")) - 1));
  await page.keyboard.press("Home");
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", "0");
});

test("a burst of wheel events from one gesture steps once", async ({ page }) => {
  await page.goto("/explore?view=circle");
  const view = page.getByTestId("space-view");
  await expect(view).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", "0");
  await view.evaluate(async (el) => {
    for (let i = 0; i < 8; i++) {
      el.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    }
  });
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-index", "1");
});

test("the default explore page is unchanged", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByTestId("mode-globe")).toBeVisible();
});
