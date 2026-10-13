import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

async function ready(page: import("@playwright/test").Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
}

test("the switcher lists the bundled data sets and defaults to canon", async ({ page }) => {
  await ready(page, "/explore?view=circle");
  const sw = page.getByTestId("data-switcher");
  await expect(sw).toHaveValue("canon");
  await expect(sw.locator("option")).toContainText(["canon", "sample advisors"]);
});

test("picking a data set swaps the data, keeps the view and writes ?data=", async ({ page }) => {
  await ready(page, "/explore?space=sphere");
  const sw = page.getByTestId("data-switcher");
  await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", "sphere");
  const canonCount = Number(await page.getByTestId("scrubber").getAttribute("data-count"));
  await sw.selectOption("sample");
  await expect(page).toHaveURL(/data=sample/);
  await expect(page.getByTestId("sample-badge")).toBeVisible();
  await expect(page.getByTestId("surface-view")).toHaveAttribute("data-mode", "sphere");
  const sampleCount = Number(await page.getByTestId("scrubber").getAttribute("data-count"));
  expect(sampleCount).toBeLessThan(canonCount);
  await sw.selectOption("canon");
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByTestId("scrubber")).toHaveAttribute("data-count", String(canonCount));
});

test("the data param loads on open and an unknown id falls back to canon", async ({ page }) => {
  await ready(page, "/explore?view=circle&data=sample");
  await expect(page.getByTestId("data-switcher")).toHaveValue("sample");
  await expect(page.getByTestId("sample-badge")).toBeVisible();
  await ready(page, "/explore?view=circle&data=..%2Fsecret");
  await expect(page.getByTestId("data-switcher")).toHaveValue("canon");
});

test("the switcher is a widget in full screen", async ({ page }) => {
  await ready(page, "/explore?view=circle");
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  const widget = page.locator('[data-widget="data"]');
  await expect(widget.getByTestId("data-switcher")).toBeVisible();
  await widget.getByTestId("data-switcher").selectOption("sample");
  await expect(page.getByTestId("sample-badge")).toBeVisible();
});

test("a search leaves the data set and the switcher says so", async ({ page }) => {
  await ready(page, "/explore?view=circle");
  await page.getByTestId("shell-query").fill("entropy");
  await expect(page.getByTestId("shell-result").first()).toBeVisible();
  await expect(page.getByTestId("data-switcher")).toHaveValue("search");
  await page.getByTestId("data-switcher").selectOption("canon");
  await expect(page.getByTestId("shell-query")).toHaveValue("");
});

test("the right panel shows the licence of the current data set", async ({ page }) => {
  await ready(page, "/explore?view=circle");
  await expect(page.getByTestId("dataset-license")).toContainText("Bucket Foundation canon index");
  await page.getByTestId("data-switcher").selectOption("sample");
  await expect(page.getByTestId("dataset-license")).toContainText("Licence:");
  await expect(page.getByTestId("dataset-info")).toContainText("6 items");
});
