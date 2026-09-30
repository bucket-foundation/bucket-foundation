import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

async function open(page: import("@playwright/test").Page) {
  await page.goto("/explore?view=slices");
  await expect(page.getByTestId("slice-stack")).toBeVisible();
  await expect(page.locator('[data-testid="slice-stack"] canvas')).toBeVisible();
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
}

test("the slice view shows the stack on the canon data", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "slices" })).toHaveAttribute("aria-checked", "true");
  const count = Number(await page.getByTestId("slice-stack").getAttribute("data-count"));
  expect(count).toBeGreaterThanOrEqual(2);
  await expect(page.getByTestId("slice-stack")).toHaveAttribute("data-active", "0");
});

test("scrolling moves one slice at a time", async ({ page }) => {
  await open(page);
  const stack = page.getByTestId("slice-stack");
  const box = (await stack.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(stack).toHaveAttribute("data-active", "1");
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, 120);
  await expect(stack).toHaveAttribute("data-active", "2");
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -120);
  await expect(stack).toHaveAttribute("data-active", "1");
});

test("a burst of wheel events from one gesture moves one slice", async ({ page }) => {
  await open(page);
  const stack = page.getByTestId("slice-stack");
  await stack.evaluate(async (el) => {
    for (let i = 0; i < 8; i++) {
      el.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 15));
    }
  });
  await expect(stack).toHaveAttribute("data-active", "1");
  await page.waitForTimeout(300);
  await stack.evaluate((el) => el.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, bubbles: true, cancelable: true })));
  await expect(stack).toHaveAttribute("data-active", "2");
});

test("the slice view has a scrubber and no rail of slice buttons", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("scrubber")).toBeVisible();
  await expect(page.locator("[data-testid^=slice-][aria-pressed]")).toHaveCount(0);
  await page.getByRole("slider", { name: "slices" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("slice-stack")).toHaveAttribute("data-active", "1");
  await page.keyboard.press("End");
  const last = Number(await page.getByTestId("slice-stack").getAttribute("data-count")) - 1;
  await expect(page.getByTestId("slice-stack")).toHaveAttribute("data-active", String(last));
});

test("the focused stack shows a focus ring", async ({ page }) => {
  await open(page);
  await page.getByTestId("slice-stack").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const outline = await page.getByTestId("slice-stack").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

test("arrow keys step and Enter opens the circle chart of the slice", async ({ page }) => {
  await open(page);
  const stack = page.getByTestId("slice-stack");
  await stack.focus();
  await page.keyboard.press("ArrowRight");
  await expect(stack).toHaveAttribute("data-active", "1");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(stack).toHaveAttribute("data-active", "0");
  await page.keyboard.press("End");
  const last = Number(await stack.getAttribute("data-count")) - 1;
  await expect(stack).toHaveAttribute("data-active", String(last));
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("circle-chart")).toBeVisible();
  await expect(page.getByTestId("slice-open")).toBeVisible();
});

test("selecting a slice goes straight to its circle chart and back", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "slices" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByTestId("slice-open-btn").click();
  const chart = page.getByTestId("circle-chart");
  await expect(chart).toBeVisible();
  await expect(chart.locator("g[data-series=mean]")).toHaveAttribute("data-vertices", "12");
  await expect(page.getByTestId("slice-open")).toContainText("observations");
  await page.getByTestId("slice-back").click();
  await expect(page.getByTestId("slice-stack")).toBeVisible();
});

test("Escape closes the opened slice", async ({ page }) => {
  await open(page);
  await page.getByTestId("slice-open-btn").click();
  await expect(page.getByTestId("slice-open")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("slice-stack")).toBeVisible();
});

test("the view switch moves between the circle and the slices", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await page.getByRole("radio", { name: "slices" }).click();
  await expect(page.getByTestId("slice-stack")).toBeVisible();
  await expect(page).toHaveURL(/space=slices/);
  await page.getByRole("radio", { name: "circle" }).click();
  await expect(page.getByTestId("circle-chart")).toBeVisible();
});
