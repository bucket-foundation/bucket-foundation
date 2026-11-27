import { expect, test, type Page } from "@playwright/test";

const OUT = process.env.SHOT_DIR ?? "/tmp";
test.setTimeout(300_000);
test.skip(!process.env.PL_FLOW_STACK, "needs the local Supabase stack and the root app; set PL_FLOW_STACK=1");

async function answerUntilResults(page: Page) {
  for (let i = 0; i < 200; i++) {
    if (await page.getByTestId("results").isVisible().catch(() => false)) return;
    const c = page.getByTestId("choice").first();
    if (await c.isEnabled().catch(() => false)) await c.click({ timeout: 1000 }).catch(() => undefined);
    await page.waitForTimeout(700);
  }
  throw new Error("no results");
}

test("two players play a game set to the end and the next game starts on its own", async ({ browser }) => {
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const playerCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const host = await hostCtx.newPage();
  const player = await playerCtx.newPage();

  await host.goto("/play");
  await host.getByTestId("nickname").fill("Hosty");
  await host.getByTestId("join-go").click();
  await host.getByTestId("setup-sequence").click();
  await host.getByTestId("create").click();
  await host.waitForURL(/\/play\/[0-9A-Z]{6}$/);
  const code = host.url().split("/").pop()!;
  await expect(host.getByTestId("room-code")).toHaveText(code);

  const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const tv = await tvCtx.newPage();
  await tv.goto(`/play/tv/${code}`);
  await tv.getByTestId("nickname").fill("Telly");
  await tv.getByTestId("nickname-go").click();
  await expect(tv.getByTestId("waiting-board")).toBeVisible();

  await player.goto("/play");
  await player.getByTestId("join-code").fill(code);
  await player.getByTestId("nickname").fill("Pia");
  await player.getByTestId("join-go").click();
  await player.waitForURL(new RegExp(`/play/${code}$`));
  await expect(player.getByTestId("ready")).toBeInViewport();
  for (const id of ["start", "fill-bots", "big-screen", "host-settings", "room-code", "next-now"]) await expect(player.getByTestId(id)).toHaveCount(0);
  await expect(player.getByTestId("invite")).toBeVisible();
  await player.screenshot({ path: `${OUT}/flow-player-wait.png`, fullPage: true });

  await host.getByTestId("host-settings").click();
  await host.getByTestId("setup-mix").click();
  await host.getByTestId("lang-set-romance").click();
  await host.getByTestId("host-settings-save").click();
  await expect(host.getByTestId("waiting-board")).toContainText("Random mix");
  await expect(player.getByTestId("waiting-board")).toContainText("Random mix", { timeout: 10_000 });
  await expect(player.getByTestId("room-langs")).toContainText("Portuguese");

  await player.getByTestId("ready").tap();
  await host.getByTestId("ready").click();
  await expect(host.getByTestId("start")).toBeEnabled({ timeout: 10_000 });
  await host.screenshot({ path: `${OUT}/flow-host-wait.png` });
  await host.getByTestId("start").click();
  await expect(player.getByTestId("countdown")).toBeVisible({ timeout: 10_000 });
  await player.screenshot({ path: `${OUT}/flow-player-countdown.png` });
  await expect(player.getByTestId("hud")).toBeVisible({ timeout: 10_000 });
  await player.waitForTimeout(1500);
  await player.screenshot({ path: `${OUT}/flow-player-round.png` });
  const dims = await player.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
  expect(dims.sh).toBeLessThanOrEqual(dims.ih);

  await expect(tv.getByTestId("tv-prompt")).toBeVisible({ timeout: 20_000 });
  await tv.screenshot({ path: `${OUT}/flow-tv-round.png` });
  await Promise.all([answerUntilResults(host), answerUntilResults(player)]);
  await expect(tv.getByTestId("podium")).toBeVisible({ timeout: 10_000 });
  await expect(tv.getByTestId("tv-next")).toBeVisible();
  await tv.screenshot({ path: `${OUT}/flow-tv-final.png` });
  await expect(host.getByTestId("rematch")).toHaveCount(0);
  await expect(player.getByTestId("next-game")).toContainText("Next game starts in");
  await expect(player.getByTestId("next-now")).toHaveCount(0);
  await expect(host.getByTestId("next-now")).toBeVisible();
  await expect(player.getByTestId("save-progress")).toBeVisible();
  await expect(player.getByTestId("next-game")).toBeInViewport();
  await expect(player.getByTestId("results-leave")).toBeVisible();
  await expect(player.getByTestId("play-bots")).toHaveCount(0);
  await player.screenshot({ path: `${OUT}/flow-player-results.png` });
  await host.screenshot({ path: `${OUT}/flow-host-results.png` });

  await expect(player.getByTestId("hud")).toBeVisible({ timeout: 30_000 });
  await expect(host.getByTestId("hud")).toBeVisible({ timeout: 30_000 });
  await player.screenshot({ path: `${OUT}/flow-player-next.png` });

  await host.getByTestId("end-game").click();
  await expect(host.getByTestId("final")).toBeVisible({ timeout: 10_000 });
  await expect(player.getByTestId("final")).toBeVisible({ timeout: 10_000 });
  await expect(player.getByTestId("end-game")).toHaveCount(0);
  await expect(player.getByTestId("save-progress")).toBeVisible();
  await expect(player.getByTestId("play-again")).toBeVisible();
  await expect(tv.getByTestId("podium")).toBeVisible({ timeout: 10_000 });
  await tv.waitForTimeout(3500);
  await tv.screenshot({ path: `${OUT}/flow-tv-ended.png` });
  await player.screenshot({ path: `${OUT}/flow-player-final.png` });
  await host.getByTestId("play-again").click();
  await host.waitForURL((u) => !u.pathname.endsWith(code), { timeout: 15_000 });
  await expect(host.getByTestId("waiting-board")).toBeVisible();
});
