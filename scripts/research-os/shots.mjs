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

async function open(page, url) {
  let res;
  try {
    res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  } catch (err) {
    throw new Error(`${url} did not answer (${err.message}). Start the dev server, or set SHOTS_BASE.`);
  }
  const status = res?.status() ?? 0;
  if (status < 200 || status > 299) {
    throw new Error(
      `${url} answered ${status}. A staff-gated path needs SHOTS_EMAIL (${EMAIL}) on RESEARCH_OS_REVIEWER_EMAILS.`,
    );
  }
  const asked = new URL(url).pathname;
  const landed = new URL(res.url()).pathname;
  if (landed !== asked) {
    throw new Error(
      `${url} redirected to ${landed}. The session expired, or SHOTS_EMAIL (${EMAIL}) is not on RESEARCH_OS_REVIEWER_EMAILS.`,
    );
  }
  return res;
}

async function revealAll(page) {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
  let previous = Infinity;
  for (let i = 0; i < 12; i += 1) {
    await page.waitForTimeout(250);
    const { total } = await hiddenAfterReveal(page);
    if (total === 0 || total >= previous) break;
    previous = total;
  }
}

async function hiddenAfterReveal(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const style = window.getComputedStyle(el);
      if (parseFloat(style.opacity) > 0.05) continue;
      if (style.display === "none" || style.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width < 24 || box.height < 24) continue;
      if (out.some((o) => o.el.contains(el))) continue;
      out.push({ el, label: `${el.tagName.toLowerCase()}.${String(el.className || "").split(" ")[0]} ${Math.round(box.width)}x${Math.round(box.height)}` });
    }
    return { total: out.length, sample: out.slice(0, 8).map((o) => o.label) };
  });
}

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
  await open(page, `${BASE}/sign-in`);
  const sent = Date.now();
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
  let res;
  try {
    res = await probe.goto(`${BASE}${paths[0]}`, { waitUntil: "networkidle", timeout: 60000 });
  } catch (err) {
    await probe.close();
    throw new Error(`${BASE}${paths[0]} did not answer (${err.message}). Start the dev server, or set SHOTS_BASE.`);
  }
  const signedOut = (await probe.locator("#sign-in-email").count()) > 0 || res?.status() === 401;
  await probe.close();
  if (signedOut) await signIn(context);

  let overflow = 0;
  let hidden = 0;
  for (const path of paths) {
    const slug = path.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "-") || "root";
    for (const [name, width, height] of WIDTHS) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height });
      await open(page, `${BASE}${path}`);
      await revealAll(page);
      const stillHidden = await hiddenAfterReveal(page);
      const file = `${OUT}/${slug}-${name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      if (stillHidden.total) {
        hidden += stillHidden.total;
        const more = stillHidden.total > stillHidden.sample.length ? `, and ${stillHidden.total - stillHidden.sample.length} more` : "";
        console.log(`  ${stillHidden.total} element(s) still transparent after a full scroll: ${stillHidden.sample.join(", ")}${more}`);
      }
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const wide = scrollWidth > width + 1;
      if (wide) overflow += 1;
      console.log(`${file}  ${scrollWidth}px wide in ${width}px  ${wide ? "OVERFLOW" : "ok"}`);
      await page.close();
    }
  }
  if (hidden > 0) console.log(`${hidden} element(s) were still transparent after a full scroll`);
  process.exitCode = overflow > 0 || hidden > 0 ? 1 : 0;
} finally {
  await context.close();
  await browser.close();
}
