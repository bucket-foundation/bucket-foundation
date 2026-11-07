import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SHOTS = process.env.PL_SHOTS_DIR ?? "test-results/stoa";

for (const [width, mobile] of [[320, true], [375, true], [390, true], [390, false]] as const) {
  test(`join fits a ${width} px ${mobile ? "phone" : "desktop window"} without clipping`, async ({ browser }) => {
    mkdirSync(SHOTS, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    for (const [path, id] of [["/join", "join-code"], ["/join/QZ7K2M", "join-name"]] as const) {
      await p.goto(path);
      if (path === "/join") await p.getByTestId("code-input").fill("QZ7K2M");
      const card = p.getByTestId(id);
      await expect(card).toBeVisible({ timeout: 60_000 });
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      for (const el of await card.locator("input, button").all()) {
        const b = (await el.boundingBox())!;
        expect(b.x + b.width, `${path} ${await el.textContent()}`).toBeLessThanOrEqual(box.x + box.width);
      }
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await p.screenshot({ path: `${SHOTS}/${id}-${width}${mobile ? "" : "-desktop"}.png` });
    }
    await ctx.close();
  });
}

test("a signed-out host sees the live-game sign-in", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto("/live");
  await expect(p.getByRole("heading", { name: "Sign in to host a live game" })).toBeVisible({ timeout: 60_000 });
  await expect(p.getByText("Sign in to learn")).toHaveCount(0);
  await expect(p.getByText("streak")).toHaveCount(0);
  await p.screenshot({ path: `${SHOTS}/live-sign-in-1280.png` });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: `${SHOTS}/live-sign-in-390.png` });
  await ctx.close();
});
