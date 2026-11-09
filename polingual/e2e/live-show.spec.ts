import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { mockApi, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR ?? "test-results/stoa-show";
const ROOM = "11111111-1111-4111-8111-111111111111";
const ME = "p1";

type Phase = "lobby" | "question" | "reveal" | "board" | "finale";

const roster = ["brave-otter", "calm-fox", "swift-heron", "lucky-lynx", "quiet-moth", "bold-crane"].map((n, i) => ({ id: i === 0 ? ME : `p${i + 1}`, nickname: n, team_slot: null }));

function state(phase: Phase, players = 6) {
  const now = Date.now();
  const standings = roster.slice(0, players).map((p, i) => ({ player_id: p.id, nickname: p.nickname, points: 2400 - i * 310 - (phase === "finale" ? 0 : 200) }));
  if (phase === "board") standings.reverse();
  return {
    server_now: now,
    room: { id: ROOM, code: "QZ7K2M", mode: "open_floor", phase, idx: 4, seq: 9, token_version: 1, verify_key: "AAAA", opens_at: now - 6000, closes_at: now + 14000, next_at: null, paused: false, locked: false, school_mode: false, expires_at: now + 3600_000, total: 15, players },
    standings,
    roster: roster.slice(0, players),
    answered: phase === "question" ? 4 : 6,
    question: { idx: 4, round: 1, kind: "pick_word", prompt: { home: "water", lang: "es", home_lang: "en" }, options: ["agua", "fuego", "tierra", "aire"], answer: phase === "question" ? null : 0, counts: phase === "question" ? null : [4, 1, 1, 0] },
    player: { id: ME, nickname: "brave-otter", removed: false, points: 2200, streak: 3, choice: phase === "question" ? null : 0, team_slot: null },
    realtime: { url: "http://127.0.0.1:9/realtime/v1", key: "anon", topic: "t" },
  };
}

async function room(page: Page, get: () => Phase, players: () => number) {
  await page.route("**/api/live/rooms/*/*", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/api/live/rooms/*/state", (r) => r.fulfill({ json: state(get(), players()) }));
  await page.route("**/api/live/join", (r) => r.fulfill({ json: { room_id: ROOM, player_id: ME, token: "tok" } }));
  await page.route("**/api/live/answer", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/api/live/probe", (r) => r.fulfill({ json: { ok: true } }));
}

test("host board animates every phase with sound controls", async ({ browser }) => {
  mkdirSync(SHOTS, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let phase: Phase = "lobby";
  let players = 2;
  await mockApi(page);
  await room(page, () => phase, () => players);
  await signIn(page);
  await page.evaluate((id) => {
    localStorage.setItem("stoa/host-terms/v1", "1");
    sessionStorage.setItem("stoa/host/v1", JSON.stringify({ room_id: id, host_token: "host", code: "QZ7K2M" }));
  }, ROOM);
  await page.goto("/live");
  await expect(page.getByTestId("board-lobby")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("sound-on").click();
  await expect(page.getByTestId("mix-music")).toBeVisible();
  players = 6;
  await expect(page.getByTestId("player-count")).toHaveText("6 players");
  await page.screenshot({ path: `${SHOTS}/host-lobby.png` });
  for (const [p, id] of [["question", "board-question"], ["reveal", "board-reveal"], ["board", "board-standings"], ["finale", "board-finale"]] as const) {
    phase = p;
    await expect(page.getByTestId(id)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(p === "finale" ? 3800 : 1200);
    await page.screenshot({ path: `${SHOTS}/host-${p}.png` });
  }
  await expect(page.getByTestId("podium")).toBeVisible();
  await expect(page.getByTestId("confetti")).toBeAttached();
  await page.getByTestId("mix-music").click();
  await expect(page.getByTestId("mix-music")).toHaveAttribute("aria-pressed", "false");
  await ctx.close();
});

test("phone plays through with warm up, ring, streak and confetti", async ({ browser }) => {
  mkdirSync(SHOTS, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  let phase: Phase = "lobby";
  await room(page, () => phase, () => 6);
  await page.goto("/join/QZ7K2M");
  await page.getByTestId("nickname").first().click();
  await expect(page.getByTestId("phone-lobby")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Practice tile A" }).click();
  await page.screenshot({ path: `${SHOTS}/phone-lobby.png`, fullPage: true });
  phase = "question";
  await expect(page.getByTestId("timer-ring")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/phone-question.png`, fullPage: true });
  phase = "reveal";
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("streak")).toHaveText("3 in a row");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/phone-reveal.png`, fullPage: true });
  phase = "finale";
  await expect(page.getByTestId("phone-finale")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/phone-finale.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await ctx.close();
});
