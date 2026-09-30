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
    await page.locator('[data-testid="dock-results"] summary').click();
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

  test("the shell is full-bleed and the dock moves between full, card and left nav", async ({ page }) => {
    await page.goto("/canon/search");
    const shell = page.getByTestId("stage-shell");
    await expect(shell).toHaveAttribute("data-layout", "full");
    const viewport = page.viewportSize()!;
    const box = (await shell.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.width).toBe(viewport.width);
    expect(box.height).toBeGreaterThan(viewport.height * 0.8);
    const stageBox = (await page.getByTestId("stage").boundingBox())!;
    expect(stageBox.width).toBeGreaterThan(viewport.width - 340);
    const dock = page.getByTestId("dock-full");
    await expect(dock.getByTestId("explore-query")).toBeVisible();
    await expect(dock.getByTestId("dock-sort")).toBeVisible();
    await page.getByTestId("dock-compact").click();
    await expect(shell).toHaveAttribute("data-layout", "compact");
    const card = page.getByTestId("dock-card");
    await expect(card.getByTestId("explore-query")).toBeVisible();
    const cardBox = (await card.boundingBox())!;
    expect(cardBox.x + cardBox.width).toBeGreaterThan(viewport.width - 5);
    await page.getByTestId("dock-to-nav").click();
    const nav = page.getByTestId("dock-nav");
    await expect(nav.getByTestId("explore-query")).toBeVisible();
    expect((await nav.boundingBox())!.x).toBe(0);
    await nav.getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("dock-open")).toBeVisible();
    await page.getByTestId("dock-open").click();
    await expect(page.getByTestId("dock-nav")).toBeVisible();
  });

  test("the right nav shows the profile and the Links section", async ({ page }) => {
    await page.goto("/canon/search?q=photon");
    const panel = page.getByTestId("explore-panel");
    await expect(panel.locator("h2")).toBeVisible();
    const links = page.getByTestId("right-nav-links");
    await expect(links).toContainText("Links (");
  });

  test("the camera and lock survive a detour through a SceneHost mode", async ({ page }) => {
    await page.goto("/canon/search");
    const stage = page.getByTestId("stage");
    await expect(stage).toHaveAttribute("data-locked", "true");
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute("data-locked", "false");
    await page.waitForTimeout(300);
    const before = Number(await stage.getAttribute("data-distance"));
    await page.getByTestId("mode-atom").click();
    await expect(page.getByTestId("explore-scene")).toBeVisible();
    await page.waitForTimeout(800);
    await page.getByTestId("mode-globe").click();
    const back = page.getByTestId("stage");
    await expect(back).toHaveAttribute("data-locked", "false");
    await expect.poll(async () => Math.abs(Number(await back.getAttribute("data-distance")) - before)).toBeLessThan(0.05);
  });
});
