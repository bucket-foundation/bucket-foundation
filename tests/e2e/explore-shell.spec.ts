import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("the shell opens on the canon data set with the canon search controls", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await expect(page.getByTestId("explore-shell")).toBeVisible();
  await expect(page.getByTestId("shell-query")).toBeVisible();
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByTestId("data-switcher")).toHaveValue("canon");
  await expect(page.getByTestId("circle-chart")).toBeVisible();
  await expect(page.getByRole("radio", { name: "circle" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: "physics" })).toBeVisible();
});

test("a query replaces the sample with canon excerpts projected on the reference basis", async ({ page }) => {
  await page.goto("/explore?view=circle");
  await page.getByTestId("shell-query").fill("entropy");
  const results = page.getByTestId("shell-result");
  await expect(results.first()).toBeVisible();
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByTestId("circle-chart").locator("g[data-vertices]").first()).toHaveAttribute("data-vertices", "12");
  await expect(page).toHaveURL(/q=entropy/);
});

test("scrolling the chart steps through the results and a click opens the drawer", async ({ page }) => {
  await page.goto("/explore?view=circle&q=entropy");
  await expect(page.getByTestId("shell-result").first()).toBeVisible();
  const current = page.getByTestId("space-current");
  await expect(current).toContainText("1 /");
  const box = (await page.getByTestId("circle-chart").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(current).toContainText("2 /");
  await page.getByTestId("shell-result").first().click();
  await expect(page.getByRole("button", { name: "close drawer" })).toBeVisible();
});

test("the branch filter narrows the search", async ({ page }) => {
  await page.goto("/explore?view=circle&q=entropy");
  await expect(page.getByTestId("shell-result").first()).toBeVisible();
  await page.getByRole("button", { name: "physics", exact: true }).click();
  await expect(page).toHaveURL(/branch=02-physics/);
});

test("the sort control and the view switch write to the URL", async ({ page }) => {
  await page.goto("/explore?view=circle&q=entropy");
  await expect(page.getByTestId("shell-result").first()).toBeVisible();
  await page.getByTestId("shell-sort").selectOption("year");
  await expect(page).toHaveURL(/sort=year/);
  await page.getByRole("radio", { name: "circle" }).click();
  await expect(page).toHaveURL(/space=circle/);
});
