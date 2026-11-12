import { expect, test, type Page } from "@playwright/test";
import { mockApi, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;
const ON = !!process.env.NEXT_PUBLIC_POLINGUAL_ADS && process.env.NEXT_PUBLIC_POLINGUAL_ADS !== "off";
const ME = "00000000-0000-4000-8000-0000000000aa";

type Screen = "lobbies" | "waiting" | "round" | "results";

function lobbyState(screen: Exclude<Screen, "lobbies">, now: number) {
  const status = screen === "waiting" ? "lobby" : screen === "round" ? "playing" : "done";
  const prompts = [0, 1, 2].map((round) => ({ round, mode: "word", lang: "es", gloss: ["water", "bread", "house"][round], choices: ["agua", "pan", "casa", "sol"], answer: screen === "results" ? ["agua", "pan", "casa"][round] : null }));
  return {
    id: "11111111-1111-4111-8111-111111111111",
    code: "ABC123",
    name: "Hana's lobby",
    game: "live",
    root: "en",
    targets: ["es", "fr"],
    seed: "42",
    status,
    listed: true,
    rounds: 3,
    roundSeconds: 60,
    startedAt: status === "lobby" ? null : new Date(now - (screen === "round" ? 2_000 : 400_000)).toISOString(),
    version: 3,
    now: new Date(now).toISOString(),
    isHost: false,
    players: [
      { userId: "h", name: "Hana", handle: "hana_k", ready: true, score: 380, isHost: true, isMe: false, online: true, answered: false },
      { userId: ME, name: "Sam", handle: null, ready: false, score: 190, isHost: false, isMe: true, online: true, answered: false },
      { userId: "r", name: "Rui", handle: "rui.p", ready: true, score: 90, isHost: false, isMe: false, online: true, answered: false },
    ],
    messages: [{ id: 1, from: "h", name: "Hana", body: "hola", at: new Date(now).toISOString() }],
    round: null,
    prompts: screen === "round" ? prompts.slice(0, 1) : screen === "results" ? prompts : [],
    results: screen === "results" ? [{ round: 0, userId: ME, correct: true, ms: 900, points: 190 }] : [],
  };
}

async function mockLobbies(page: Page, screen: Screen) {
  await page.route("**/api/academy/lobbies/guest", (r) => r.fulfill({ json: { token: "pl-guest.test", userId: ME, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } }));
  await page.route("**/api/academy/lobbies/guest/merge", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/api/academy/lobbies", (r) =>
    r.fulfill({ json: { lobbies: [{ id: "L1", code: "ABC123", name: "Hana's lobby", game: "live", root: "en", targets: ["es", "fr"], status: "lobby", players: 2, host: "Hana", hostHandle: "hana_k", isMember: false }, { id: "L2", code: "XYZ789", name: "Guest room", game: "daily", root: "en", targets: ["it"], status: "lobby", players: 1, host: "Kit", hostHandle: null, isMember: false }] } }),
  );
  if (screen === "lobbies") return;
  await page.route("**/api/academy/lobbies/join", (r) => r.fulfill({ json: { lobby: lobbyState(screen, Date.now()) } }));
  await page.route("**/api/academy/lobbies/answer", (r) => {
    const lobby = lobbyState(screen, Date.now());
    lobby.results = [{ round: 0, userId: ME, correct: true, ms: 900, points: 190 }];
    return r.fulfill({ json: { correct: true, points: 190, ms: 900, lobby } });
  });
  await page.route("**/api/academy/lobbies/state**", (r) => r.fulfill({ json: { changed: false, now: new Date().toISOString() } }));
}

async function open(page: Page, screen: Screen) {
  await page.addInitScript(() => window.localStorage.setItem("polingual-web/lobby-nick/v1", "Sam"));
  await mockLobbies(page, screen);
  await page.goto(screen === "lobbies" ? "/play" : "/play/ABC123");
  const marker = { lobbies: "lobbies", waiting: "room", round: "prompt", results: "results" }[screen];
  await expect(page.getByTestId(marker)).toBeVisible();
}

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe("ad layout", () => {
  test.skip(!ON, "set NEXT_PUBLIC_POLINGUAL_ADS for the dev server");

  for (const width of [1440, 1024, 390]) {
    for (const screen of ["lobbies", "waiting", "round", "results"] as Screen[]) {
      test(`${screen} at ${width}px`, async ({ page }) => {
        const height = width > 500 ? 900 : 844;
        await page.setViewportSize({ width, height });
        await open(page, screen);
        const frame = page.getByTestId("play-frame");
        if (width >= 1000) {
          const size = width >= 1360 ? "300x600" : "160x600";
          await expect(frame).toHaveAttribute("data-ads", width >= 1360 ? "rail-300" : "rail-160");
          const left = page.getByTestId("ad-rail-left");
          const right = page.getByTestId("ad-rail-right");
          await expect(left).toHaveAttribute("data-ad-size", size);
          await expect(right).toHaveAttribute("data-ad-size", size);
          await expect(page.getByTestId("ad-banner")).toHaveCount(0);
          const l = (await left.boundingBox()) as Box;
          const r = (await right.boundingBox()) as Box;
          const c = (await page.locator("main").boundingBox()) as Box;
          expect(l.width).toBe(Number(size.split("x")[0]));
          expect(l.height).toBe(600);
          expect(l.x + l.width).toBeLessThan(c.x);
          expect(r.x).toBeGreaterThan(c.x + c.width);
          expect(Math.abs(l.x - (width - (r.x + r.width)))).toBeLessThanOrEqual(2);
          expect(c.width).toBeGreaterThan(600);
        } else {
          await expect(frame).toHaveAttribute("data-ads", "phone");
          await expect(page.getByTestId("ad-rail-left")).toHaveCount(0);
          const banner = page.getByTestId("ad-banner");
          await expect(banner).toHaveAttribute("data-ad-size", "320x50");
          const b = (await banner.boundingBox()) as Box;
          expect(b.y + b.height).toBeLessThanOrEqual(height);
          const scroller = (await page.getByTestId("play-scroll").boundingBox()) as Box;
          expect(scroller.y + scroller.height).toBeLessThanOrEqual(b.y + 0.5);
          const controls = page.locator("main").locator("button:visible, input:visible, select:visible, a:visible");
          for (let i = 0; i < (await controls.count()); i++) {
            const c = controls.nth(i);
            await c.scrollIntoViewIfNeeded();
            const box = (await c.boundingBox()) as Box;
            expect(overlaps(b, box), JSON.stringify(box)).toBe(false);
          }
        }
        if (screen === "round") await expect(page.getByTestId("choice").first()).toBeInViewport();
        if (screen === "lobbies") await expect(page.getByTestId("host-handle")).toHaveText(" @hana_k");
        if (screen === "round") {
          await page.getByTestId("choice").first().click();
          await expect(page.getByTestId("ad-between-rounds")).toBeVisible();
        }
        if (screen !== "lobbies") await expect(page.getByTestId("player-handle").first()).toHaveText(" @hana_k");
        if (screen === "results") await expect(page.getByTestId("ad-results")).toBeVisible();
        const sw = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(sw).toBeLessThanOrEqual(width);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/${screen}-${width}.png` });
      });
    }
  }

  test("subscribers see no ads", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockApi(page, { entitled: true });
    await signIn(page);
    await expect(page.getByTestId("sign-out")).toBeVisible();
    await mockLobbies(page, "lobbies");
    await page.goto("/play");
    await expect(page.getByTestId("lobbies")).toBeVisible();
    await expect(page.getByTestId("play-frame")).toHaveAttribute("data-ads", "off");
    await expect(page.locator("[aria-label=Advertisement]")).toHaveCount(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/subscriber-1440.png` });
  });

  test("signed-in free accounts see ads", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockApi(page, { entitled: false });
    await signIn(page);
    await mockLobbies(page, "lobbies");
    await page.goto("/play");
    await expect(page.getByTestId("play-frame")).toHaveAttribute("data-ads", "rail-300");
  });

  test("learning screens carry no ads", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockApi(page, { entitled: false });
    await signIn(page);
    await expect(page.getByTestId("sign-out")).toBeVisible();
    await expect(page.locator("[aria-label=Advertisement]")).toHaveCount(0);
  });

  test("EEA and UK visitors get the consent banner once", async ({ browser }) => {
    for (const [country, shows] of [["DE", true], ["GB", true], ["US", false]] as const) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "x-vercel-ip-country": country } });
      const page = await ctx.newPage();
      await mockLobbies(page, "lobbies");
      await page.goto("/play");
      await expect(page.getByTestId("lobbies")).toBeVisible();
      if (!shows) {
        await expect(page.getByTestId("consent")).toHaveCount(0);
      } else {
        await expect(page.getByTestId("consent")).toBeVisible();
        if (SHOTS && country === "DE") await page.screenshot({ path: `${SHOTS}/consent-390.png` });
        await page.getByTestId("consent-reject").click();
        await expect(page.getByTestId("consent")).toHaveCount(0);
        await page.reload();
        await expect(page.getByTestId("lobbies")).toBeVisible();
        await expect(page.getByTestId("consent")).toHaveCount(0);
      }
      await ctx.close();
    }
  });

  test("ads.txt is 404 while the publisher id is unset", async ({ request }) => {
    test.skip(!!process.env.POLINGUAL_ADSENSE_PUB_ID, "publisher id set");
    expect((await request.get("/ads.txt")).status()).toBe(404);
  });
});

test("flag off keeps the play pages free of ad boxes", async ({ page }) => {
  test.skip(ON, "flag is on for this server");
  await mockLobbies(page, "lobbies");
  await page.addInitScript(() => window.localStorage.setItem("polingual-web/lobby-nick/v1", "Sam"));
  await page.goto("/play");
  await expect(page.getByTestId("lobbies")).toBeVisible();
  await expect(page.getByTestId("play-frame")).toHaveAttribute("data-ads", "off");
});
