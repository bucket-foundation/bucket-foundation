import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("canon search loads with its heading and a canvas", async ({ page }) => {
  await page.goto("/canon/search");
  await expect(page.getByRole("heading", { level: 1, name: "Search the canon." })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("canon search switches between the globe and circle views", async ({ page }) => {
  test.skip(process.env.E2E_STAGE_V2 === "1", "the legacy globe and circle views are replaced by the stage");
  await page.goto("/canon/search?view=globe");
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.goto("/canon/search?view=circle");
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "expand to fullscreen" })).toBeVisible();
});

test("explore still loads with the globe mode selected", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("tablist", { name: "Mode" })).toBeVisible();
  await expect(page.getByTestId("mode-globe")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("explore mode switch changes the selected mode and the URL", async ({ page }) => {
  await page.goto("/explore");
  for (const id of ["helix", "atom", "globe"]) {
    await page.getByTestId(`mode-${id}`).click();
    await expect(page.getByTestId(`mode-${id}`)).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(new RegExp(`mode=${id}`));
  }
});

test("explore reads the mode from the URL", async ({ page }) => {
  await page.goto("/explore?mode=helix");
  await expect(page.getByTestId("mode-helix")).toHaveAttribute("aria-selected", "true");
});

test.describe("stage render path", () => {
  test.skip(process.env.E2E_STAGE_V2 !== "1", "set E2E_STAGE_V2=1 with STAGE_V2=1 on the server");

  test("the stage keeps its camera distance across mode switches and locks home", async ({ page }) => {
    await page.goto("/explore");
    const stage = page.getByTestId("stage");
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute("data-locked", "true");
    await expect.poll(() => stage.getAttribute("data-distance")).not.toBeNull();
    const before = await stage.getAttribute("data-distance");
    await page.getByTestId("mode-helix").click();
    await expect(page.getByTestId("mode-helix")).toHaveAttribute("aria-selected", "true");
    await expect(stage).toBeVisible();
    await page.getByTestId("mode-globe").click();
    await expect(stage).toHaveAttribute("data-locked", "true");
    expect(await stage.getAttribute("data-distance")).toBe(before);
  });

  test("explore redirects to canon search and keeps q, mode and sel", async ({ page }) => {
    await page.goto("/explore?q=photon&mode=helix");
    await expect(page).toHaveURL(/\/canon\/search\?/);
    await expect(page).toHaveURL(/q=photon/);
    await expect(page).toHaveURL(/mode=helix/);
    await expect(page.getByTestId("mode-helix")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("explore-query")).toHaveValue("photon");
    await expect(page.getByTestId("stage")).toBeVisible();
    const first = page.getByTestId("explore-results").locator("button").first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page).toHaveURL(/sel=/);
    const sel = new URL(page.url()).searchParams.get("sel");
    await page.goto(`/explore?q=photon&mode=helix&sel=${encodeURIComponent(sel as string)}`);
    await expect(page).toHaveURL(new RegExp(`sel=${encodeURIComponent(sel as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  test("orbiting unlocks the home view and Home locks it again", async ({ page }) => {
    await page.goto("/explore");
    const stage = page.getByTestId("stage");
    await expect(stage).toHaveAttribute("data-locked", "true");
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 30, { steps: 6 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute("data-locked", "false");
    await page.getByTestId("stage-home").click();
    await expect(stage).toHaveAttribute("data-locked", "true");
  });
});
