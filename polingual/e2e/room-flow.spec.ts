import { expect, test, type Browser, type Page } from "@playwright/test";

const OUT = process.env.SHOT_DIR ?? "/tmp";
test.setTimeout(420_000);
test.skip(!process.env.PL_FLOW_STACK, "needs the local Supabase stack and the root app; set PL_FLOW_STACK=1");

async function answerUntilResults(page: Page) {
  for (let i = 0; i < 300; i++) {
    if (await page.getByTestId("results").isVisible().catch(() => false)) return;
    const c = page.getByTestId("choice").first();
    if (await c.isEnabled().catch(() => false)) await c.click({ timeout: 1000 }).catch(() => undefined);
    await page.waitForTimeout(700);
  }
  throw new Error("no results");
}

async function joinPhone(browser: Browser, code: string, name: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto("/play");
  await page.getByTestId("join-code").fill(code);
  await page.getByTestId("nickname").fill(name);
  await page.getByTestId("join-go").click();
  await page.waitForURL(new RegExp(`/play/${code}$`));
  await expect(page.getByTestId("ready")).toBeInViewport();
  return page;
}

test("a host screen runs a family night for two phones and an audience, moves on, and closes the lobby", async ({ browser }) => {
  const hostCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const host = await hostCtx.newPage();
  await host.goto("/play");
  await host.getByTestId("nickname").fill("Hosty");
  await host.getByTestId("join-go").click();
  await host.getByTestId("setup-night").click();
  await host.getByTestId("lang-set-romance").click();
  await host.getByTestId("mode-screen").click();
  await host.getByTestId("create").click();
  await host.waitForURL(/\/play\/[0-9A-Z]{6}$/);
  const code = host.url().split("/").pop()!;
  await expect(host.getByTestId("host-bar")).toBeVisible();
  await expect(host.getByTestId("ready")).toHaveCount(0);

  const pia = await joinPhone(browser, code, "Pia");
  const leo = await joinPhone(browser, code, "Leo");
  for (const id of ["start", "fill-bots", "host-settings", "room-code", "next-now", "end-game", "mode-screen"]) await expect(pia.getByTestId(id)).toHaveCount(0);
  await expect(host.getByTestId("players")).toContainText("Leo", { timeout: 10_000 });
  await expect(host.getByTestId("players")).not.toContainText("Hosty");

  await expect(host.getByTestId("waiting-board")).toContainText("Family night");
  await pia.getByTestId("react-🔥").tap();
  await expect(host.getByTestId("tv-reactions")).toBeVisible({ timeout: 10_000 });
  await host.screenshot({ path: `${OUT}/flow-host-reaction.png` });
  await pia.getByTestId("ready").tap();
  await leo.getByTestId("ready").tap();
  await expect(host.getByTestId("start")).toBeEnabled({ timeout: 10_000 });
  await host.screenshot({ path: `${OUT}/flow-host-wait.png` });
  await host.getByTestId("start").click();

  await expect(host.locator("[data-testid=tv-round] [role=listitem]").first()).toBeVisible({ timeout: 20_000 });
  await expect(host.getByTestId("tv-night")).toContainText("Warm Up");
  const fanCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const fan = await fanCtx.newPage();
  await fan.goto("/play");
  await fan.getByTestId("join-code").fill(code);
  await fan.getByTestId("nickname").fill("Fan");
  await fan.getByTestId("join-go").click();
  await fan.getByTestId("audience-adult").tap({ timeout: 15_000 });
  await expect(fan.getByTestId("audience-room")).toBeVisible();
  await fan.getByTestId("audience-vote").first().tap({ timeout: 30_000 });
  await expect(host.getByTestId("tv-audience")).toBeVisible({ timeout: 10_000 });
  await fan.screenshot({ path: `${OUT}/flow-audience.png` });
  await host.screenshot({ path: `${OUT}/flow-host-round.png` });
  await pia.screenshot({ path: `${OUT}/flow-player-round.png` });
  await Promise.all([answerUntilResults(pia), answerUntilResults(leo)]);
  await expect(host.getByTestId("podium")).toBeVisible({ timeout: 10_000 });
  await expect(pia.getByTestId("next-game")).toContainText("Next game starts in");
  await expect(pia.getByTestId("rematch")).toHaveCount(0);
  await host.screenshot({ path: `${OUT}/flow-host-results.png` });
  await host.getByTestId("next-now").click();
  await expect(pia.getByTestId("hud")).toBeVisible({ timeout: 20_000 });
  await expect(leo.getByTestId("hud")).toBeVisible({ timeout: 20_000 });

  await host.getByTestId("end-game").click();
  await expect(pia.getByTestId("final")).toBeVisible({ timeout: 10_000 });
  await expect(leo.getByTestId("final")).toBeVisible({ timeout: 10_000 });
  await pia.screenshot({ path: `${OUT}/flow-player-final.png` });
});
