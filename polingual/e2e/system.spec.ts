import { expect, test } from "@playwright/test";
import { mockApi, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;

for (const width of [1280, 390]) {
  test(`pick a system and take placement at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 800 : 844 });
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const api = await mockApi(page);
    await signIn(page);
    await expect(page.getByTestId("new-system")).toBeVisible();
    await page.getByTestId("create-system").click();
    await expect(page.getByTestId("system-error")).toContainText("at least one language");
    await page.getByTestId("preset").filter({ hasText: "Iberian" }).click();
    await page.getByTestId("lang-fr").click();
    await expect(page.getByTestId("lang-fr")).toHaveAttribute("aria-pressed", "true");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/system-${width}.png`, fullPage: true });
    await page.getByTestId("create-system").click();
    await expect(page).toHaveURL(/\/app\/en-es-pt-fr\/place\?lang=es$/);
    await expect(page.getByTestId("placement")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("counter")).toContainText("Question 1 · level A1");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/placement-${width}.png` });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(width);
    await expect(async () => {
      const skip = page.getByTestId("skip");
      if (await skip.isVisible()) await skip.click({ timeout: 1000 });
      await expect(page.getByTestId("placement-done")).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByTestId("placement-done")).toBeVisible();
    await expect(page.getByTestId("bands")).toContainText("A1");
    await expect.poll(() => api.posts.filter((p) => p.branch === "lang-systems").length).toBeGreaterThan(0);
    const doc = api.branches["lang-systems"].data as { systems: { id: string; targets: string[]; placement: Record<string, number> }[] };
    const saved = doc.systems.find((s) => s.id === "en-es-pt-fr");
    expect(saved?.targets).toEqual(["es", "pt", "fr"]);
    await expect.poll(() => (api.branches["lang-systems"].data as typeof doc).systems[0].placement.es).toBeDefined();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/placement-done-${width}.png` });
    expect(errors.filter((e) => !e.includes("404"))).toEqual([]);
    await page.getByRole("link", { name: "Place Portuguese" }).click();
    await expect(page).toHaveURL(/lang=pt$/);
  });
}

test("home lists a saved system with its levels", async ({ page }) => {
  await mockApi(page, { branches: { "lang-systems": { updated_at: new Date().toISOString(), data: { systems: [{ id: "en-de", name: "German", root: "en", targets: ["de"], createdAt: 1, placement: { de: 2 }, levels: { de: "A2" } }], removed: {} } } } });
  await signIn(page);
  await expect(page.getByTestId("system-tile")).toContainText("A2");
  await expect(page.getByRole("link", { name: "Start today" })).toHaveAttribute("href", "/app/en-de/study");
});
