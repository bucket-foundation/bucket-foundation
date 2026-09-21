/**
 * Screenshots of a Research OS page at desktop and phone width, signed in
 * against the local Supabase stack, for the standing rule that every loop
 * task shows its work on the frontend (BEADS-PENDING, ros-frontend).
 *
 * The session is an email one-time code read from the local mail catcher
 * (Mailpit on 54324), so it needs the local stack and a dev server, and it
 * touches nothing hosted. The session is saved and reused until it expires.
 *
 *   node scripts/research-os/shots.mjs /research-os/roadmap [more paths...]
 *
 * Env: SHOTS_BASE (default http://127.0.0.1:3140), SHOTS_MAIL
 * (default http://127.0.0.1:54324), SHOTS_EMAIL, SHOTS_OUT.
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";

const BASE = process.env.SHOTS_BASE ?? "http://127.0.0.1:3140";
const MAIL = process.env.SHOTS_MAIL ?? "http://127.0.0.1:54324";
const EMAIL = process.env.SHOTS_EMAIL ?? "ros-shots@bucket.test";
const OUT = process.env.SHOTS_OUT ?? "/tmp/ros-shots";
const STATE = `${OUT}/session.json`;
const WIDTHS = [
  ["desktop", 1280, 900],
  ["phone", 390, 844],
];

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("usage: node scripts/research-os/shots.mjs <path> [path...]");
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

async function mail(path) {
  try {
    return await fetch(`${MAIL}${path}`);
  } catch (err) {
    throw new Error(
      `the mail catcher at ${MAIL} did not answer (${err.message}). Start the local Supabase stack with npm run db:local, or set SHOTS_MAIL.`,
    );
  }
}

async function latestCode(address, after) {
  // Mailpit, which the local Supabase stack runs on 54324: a list endpoint
  // and one message by id.
  for (let i = 0; i < 30; i += 1) {
    const res = await mail("/api/v1/messages?limit=20");
    if (res.ok) {
      const { messages = [] } = await res.json();
      const mine = messages
        .filter((m) => (m.To ?? []).some((t) => t.Address?.toLowerCase() === address.toLowerCase()))
        .filter((m) => new Date(m.Created).getTime() >= after - 5000)
        .sort((a, b) => new Date(b.Created) - new Date(a.Created));
      for (const m of mine) {
        const full = await mail(`/api/v1/message/${m.ID}`);
        if (!full.ok) continue;
        const body = await full.json();
        const hit = `${body.Text ?? ""} ${body.HTML ?? ""}`.match(/\b(\d{6})\b/);
        if (hit) return hit[1];
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`no six-digit code reached ${address} at ${MAIL}`);
}

async function signIn(context) {
  const page = await context.newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle", timeout: 60000 });
  const sent = Date.now();
  // Type after hydration, since a fill before it is lost when React mounts.
  await page.locator("#sign-in-email").click();
  await page.locator("#sign-in-email").pressSequentially(EMAIL, { delay: 15 });
  await page.locator("button[type=submit]:not([disabled])").click({ timeout: 30000 });
  await page.waitForSelector("#sign-in-code", { timeout: 30000 });
  const code = await latestCode(EMAIL, sent);
  await page.locator("#sign-in-code").click();
  await page.locator("#sign-in-code").pressSequentially(code, { delay: 15 });
  await page.locator("button[type=submit]:not([disabled])").click({ timeout: 30000 });
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30000 });
  await context.storageState({ path: STATE });
  await page.close();
}

const browser = await chromium.launch();
const context = await browser.newContext(existsSync(STATE) ? { storageState: STATE } : {});
try {
  const probe = await context.newPage();
  await probe.goto(`${BASE}${paths[0]}`, { waitUntil: "networkidle", timeout: 60000 });
  const signedOut = await probe.locator("#sign-in-email").count();
  await probe.close();
  if (signedOut > 0) await signIn(context);

  let overflow = 0;
  for (const path of paths) {
    const slug = path.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "-") || "root";
    for (const [name, width, height] of WIDTHS) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height });
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
      const file = `${OUT}/${slug}-${name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const wide = scrollWidth > width + 1;
      if (wide) overflow += 1;
      console.log(`${file}  ${scrollWidth}px wide in ${width}px  ${wide ? "OVERFLOW" : "ok"}`);
      await page.close();
    }
  }
  process.exitCode = overflow > 0 ? 1 : 0;
} finally {
  await context.close();
  await browser.close();
}
