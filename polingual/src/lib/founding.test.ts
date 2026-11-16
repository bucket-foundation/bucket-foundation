import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { RateLimiter } from "./beta";
import { claimFounding, confirmEmail, confirmFounding, familyEmail, familyKey, fetchSpots, FOUNDING_FAMILIES, OFFER, tokenHash, type ConfirmOutcome, foundingStatus, ipHash, parseCodes, type Outcome } from "./founding";

const env = { RESEND_API_KEY: "k", POLINGUAL_DB_SERVICE_KEY: "s", POLINGUAL_DB_URL: "https://db.test", TURNSTILE_SECRET_KEY: "ts", TURNSTILE_SITE_KEY: "site" };
const site = { origin: "https://www.polingual.com", ip: "1.2.3.4", token: "tok" };
const fresh = () => ({ ip: new RateLimiter(5, 600_000), email: new RateLimiter(2, 3_600_000) });

type Reply = [number, unknown];
function fake(replies: Reply[]) {
  const calls: { url: string; body: string }[] = [];
  const send = async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body ?? "") });
    const [status, body] = replies[calls.length - 1] ?? [200, {}];
    return new Response(JSON.stringify(body), { status });
  };
  return { calls, send };
}
const human: Reply = [200, { success: true, hostname: "www.polingual.com" }];
const row = (outcome: Outcome, left = 100): Reply => [200, [{ outcome, spots_left: left }]];

const confirmRow = (outcome: ConfirmOutcome, address: string | null, left = 100): Reply => [200, [{ outcome, address, spots_left: left }]];
const TOKEN = "ab".repeat(32);

test("a signup stores a pending claim and emails a confirm link, taking no spot", async () => {
  const f = fake([human, row("pending", 500), [200, {}]]);
  const r = await claimFounding({ email: "Ana.Lopez+kids@Gmail.com" }, env, f.send, site, fresh());
  assert.deepEqual(r, { status: 200, body: { ok: true, left: 500 } });
  assert.match(f.calls[0].url, /turnstile\/v0\/siteverify/);
  assert.equal(f.calls[1].url, "https://db.test/rest/v1/rpc/claim_founding_family");
  const args = JSON.parse(f.calls[1].body);
  assert.equal(args.p_email, "analopez@gmail.com");
  assert.equal(args.p_address, "ana.lopez+kids@gmail.com");
  assert.equal(args.p_ip_hash, ipHash("1.2.3.4", env));
  assert.equal(args.p_cap, 500);
  const mail = JSON.parse(f.calls[2].body);
  assert.deepEqual(mail.to, ["ana.lopez+kids@gmail.com"]);
  const token = mail.text.match(/polingual\.com\/founding\?token=([0-9a-f]{64})/)[1];
  assert.equal(args.p_token_hash, tokenHash(token));
  assert.ok(!JSON.stringify(r.body).includes(token));
});

test("Gmail dots and plus tags on any domain fold into one family key", () => {
  assert.equal(familyKey("a.n.a+x@gmail.com"), "ana@gmail.com");
  assert.equal(familyKey("ana@googlemail.com"), "ana@gmail.com");
  assert.equal(familyKey("ana.lopez+kids@example.com"), "ana.lopez@example.com");
  assert.equal(familyKey("Ana@Example.com"), "ana@example.com");
});

test("aliases of one inbox share one email rate limit", async () => {
  const limits = fresh();
  const send = async (url: string) => new Response(JSON.stringify(url.includes("siteverify") ? { success: true } : url.includes("rpc") ? [{ outcome: "recent", spots_left: 9 }] : {}));
  const codes = [];
  for (const email of ["ana@gmail.com", "a.na@gmail.com", "ana+1@gmail.com"]) codes.push((await claimFounding({ email }, env, send, site, limits)).status);
  assert.deepEqual(codes, [200, 200, 429]);
});

test("a forged origin with no human token takes no spot", async () => {
  const f = fake([[200, { success: false }]]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, { ...site, token: "forged" }, fresh());
  assert.equal(r.status, 403);
  assert.ok(!f.calls.some((c) => c.url.includes("claim_founding_family")));
});

test("missing token never reaches the database", async () => {
  const f = fake([]);
  assert.equal((await claimFounding({ email: "a@b.co" }, env, f.send, { ...site, token: null }, fresh())).status, 403);
  assert.equal(f.calls.length, 0);
});

test("50 scripted claims from one network with fresh limiters stay under the database cap", async () => {
  let taken = 0;
  const send = async (url: string) => {
    if (url.includes("siteverify")) return new Response(JSON.stringify({ success: true }));
    if (url.includes("claim_founding_family")) {
      const outcome = taken < 3 ? "pending" : "ip-limit";
      if (outcome === "pending") taken++;
      return new Response(JSON.stringify([{ outcome, spots_left: 500 }]));
    }
    return new Response("{}");
  };
  const results = [];
  for (let i = 0; i < 50; i++) results.push(await claimFounding({ email: `d${i}@x.co` }, env, send, site, fresh()));
  assert.equal(taken, 3);
  assert.equal(results.filter((r) => r.status === 429).length, 47);
});

test("a recent repeat sends no second email and a confirmed address answers like a fresh signup", async () => {
  const recent = fake([human, row("recent")]);
  assert.equal((await claimFounding({ email: "a@b.co" }, env, recent.send, site, fresh())).status, 200);
  assert.equal(recent.calls.length, 2);
  const done = fake([human, row("confirmed", 7), [200, {}]]);
  const fresh1 = fake([human, row("pending", 7), [200, {}]]);
  const held = await claimFounding({ email: "a@b.co" }, env, done.send, site, fresh());
  assert.deepEqual(held, await claimFounding({ email: "a@b.co" }, env, fresh1.send, site, fresh()));
  assert.deepEqual(held, { status: 200, body: { ok: true, left: 7 } });
  assert.match(done.calls[2].body, /Your spot is confirmed/);
  assert.doesNotMatch(done.calls[2].body, /founding\?token=/);
});

test("a signup after 500 confirmed families is refused and gets no email", async () => {
  const f = fake([human, row("full", 0)]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, site, fresh());
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { error: "All 500 founding family spots are taken.", full: true, left: 0 });
  assert.equal(f.calls.length, 2);
});

test("a failed confirm email says when to retry", async () => {
  const f = fake([human, row("pending", 3), [500, {}]]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, site, fresh());
  assert.equal(r.status, 502);
  assert.match(r.body.error ?? "", /10 minutes/);
});

test("confirming a token takes the spot and emails the confirmation to the stored address", async () => {
  const f = fake([confirmRow("confirmed", "ana@example.com", 499), [200, {}]]);
  const r = await confirmFounding({ token: TOKEN }, env, f.send, site, new RateLimiter(5, 600_000));
  assert.deepEqual(r, { status: 200, body: { ok: true, left: 499, confirmed: true } });
  assert.equal(f.calls[0].url, "https://db.test/rest/v1/rpc/confirm_founding_family");
  assert.deepEqual(JSON.parse(f.calls[0].body), { p_token_hash: tokenHash(TOKEN), p_cap: 500 });
  assert.deepEqual(JSON.parse(f.calls[1].body).to, ["ana@example.com"]);
  assert.match(f.calls[1].body, /Your spot is confirmed/);
});

test("a second confirm sends no second email, and bad, unknown or late tokens take no spot", async () => {
  const again = fake([confirmRow("already", "ana@example.com", 499)]);
  assert.equal((await confirmFounding({ token: TOKEN }, env, again.send, site, new RateLimiter(5, 600_000))).status, 200);
  assert.equal(again.calls.length, 1);
  const bad = fake([]);
  assert.equal((await confirmFounding({ token: "nope" }, env, bad.send, site, new RateLimiter(5, 600_000))).status, 400);
  assert.equal(bad.calls.length, 0);
  assert.equal((await confirmFounding({ token: TOKEN }, env, fake([confirmRow("invalid", null)]).send, site, new RateLimiter(5, 600_000))).status, 404);
  const late = await confirmFounding({ token: TOKEN }, env, fake([confirmRow("full", "x@y.co", 0)]).send, site, new RateLimiter(5, 600_000));
  assert.equal(late.status, 409);
  assert.equal(late.body.full, true);
  assert.equal((await confirmFounding({ token: TOKEN }, env, bad.send, { ...site, origin: "https://evil.example" }, new RateLimiter(5, 600_000))).status, 403);
});

test("offline until every key is set", async () => {
  for (const drop of Object.keys(env)) {
    const partial: Record<string, string> = { ...env };
    delete partial[drop];
    const f = fake([]);
    assert.equal((await claimFounding({ email: "a@b.co" }, partial, f.send, site, fresh())).status, 503, drop);
    assert.equal(f.calls.length, 0);
  }
});

test("rejects other origins and honeypot hits", async () => {
  const f = fake([]);
  assert.equal((await claimFounding({ email: "a@b.co" }, env, f.send, { ...site, origin: "https://evil.example" }, fresh())).status, 403);
  const bot = await claimFounding({ email: "a@b.co", website: "x" }, env, f.send, site, fresh());
  assert.equal(bot.status, 400);
  assert.equal(bot.body.ok, undefined);
  assert.match(bot.body.error ?? "", /did not go through/);
  assert.equal(f.calls.length, 0);
});

test("spots read from the database and hide when offline", async () => {
  assert.deepEqual(await fetchSpots(env, fake([[200, [{ total: 500, spots_left: 417 }]]]).send), { total: 500, left: 417 });
  const read = fake([[200, [{ total: 500, spots_left: 1 }]]]);
  await fetchSpots(env, read.send);
  assert.equal(read.calls[0].url, "https://db.test/rest/v1/rpc/founding_family_spots");
  assert.deepEqual(JSON.parse(read.calls[0].body), { p_cap: FOUNDING_FAMILIES });
  assert.equal(await fetchSpots(env, fake([[500, {}]]).send), null);
  assert.equal(await fetchSpots(env, fake([[200, [{ total: 0, spots_left: 0 }]]]).send), null);
  assert.equal(await fetchSpots({}, fake([]).send), null);
  const slow = async () => Promise.reject(new DOMException("timeout", "TimeoutError"));
  assert.equal(await fetchSpots(env, slow), null);
});

test("founding status answers 200 and keeps the Turnstile key when spots are offline", async () => {
  const offline = await foundingStatus(env, fake([[500, {}]]).send);
  assert.deepEqual(offline, { body: { open: false, siteKey: env.TURNSTILE_SITE_KEY }, cache: "no-store" });
  assert.deepEqual(await foundingStatus({}, fake([]).send), { body: { open: false }, cache: "no-store" });
  const live = await foundingStatus(env, fake([[200, [{ total: 500, spots_left: 9 }]]]).send);
  assert.deepEqual(live, { body: { total: 500, left: 9, siteKey: env.TURNSTILE_SITE_KEY }, cache: "s-maxage=30" });
});

test("ip hash is salted and stable", () => {
  assert.equal(ipHash("1.2.3.4", env), ipHash("1.2.3.4", env));
  assert.notEqual(ipHash("1.2.3.4", env), ipHash("1.2.3.4", { FOUNDING_IP_SALT: "other" }));
  assert.ok(!ipHash("1.2.3.4", env).includes("1.2.3.4"));
});

test("parseCodes trims, uppercases and dedupes", () => {
  assert.deepEqual(parseCodes("abc123, ABC123\nzz9999  bad\n"), ["ABC123", "ZZ9999"]);
});

test("both emails carry the delivered promise and neither names an unbuilt step", () => {
  const ask = confirmEmail("a@b.co", "P <p@x.co>", TOKEN);
  const done = familyEmail("a@b.co", "P <p@x.co>");
  assert.equal(OFFER, "Founding families get the Family plan free for life. We email your code when family plans open.");
  assert.equal(ask.subject, "Confirm your Polingual founding family spot");
  assert.equal(done.subject, "Your Polingual founding family spot");
  for (const body of [ask.text, ask.html, done.text, done.html]) {
    assert.ok(body.includes(OFFER));
    assert.doesNotMatch(body, /testflight|\u2014|\u2013/i);
  }
  for (const body of [ask.text, ask.html]) assert.ok(body.includes(`https://www.polingual.com/founding?token=${TOKEN}`));
  for (const body of [done.text, done.html]) {
    assert.match(body, /one of 500 Polingual founding family spots/);
    assert.match(body, /apps\.apple\.com\/app\/id6825177856/);
    assert.match(body, /privacy@polingual\.com/);
  }
});

test("no offer codes are committed", () => {
  const ignore = readFileSync(join(__dirname, "../../.gitignore"), "utf8");
  assert.match(ignore, /founding-codes\*/);
});

const betaJs = readFileSync(join(__dirname, "../../public/d8/beta.js"), "utf8");

function loadBeta(nav: { userAgent: string; platform: string; maxTouchPoints: number }) {
  const clicks: ((x: unknown) => void)[] = [];
  const events: string[] = [];
  const fetches: string[] = [];
  const el = (): unknown => new Proxy(function () {}, { get: (o: any, k) => (k in o ? o[k] : (o[k] = el())), apply: () => el() });
  const doc = { referrer: "", documentElement: { lang: "en" }, head: el(), body: el(), querySelector: () => null, createElement: () => el(), addEventListener: (type: string, f: (x: unknown) => void) => type === "click" && clicks.push(f) };
  const win: Record<string, unknown> = {
    document: doc,
    navigator: { ...nav, sendBeacon: () => true },
    location: { search: "", pathname: "/" },
    localStorage: { getItem: () => null, setItem: () => {} },
    crypto: { randomUUID: () => "v" },
    plPixel: (n: string) => events.push(n),
    URLSearchParams,
    URL,
    CustomEvent: class {},
    setTimeout: () => 0,
    addEventListener: () => {},
    fetch: (url: string) => (fetches.push(url), Promise.resolve({ ok: false })),
  };
  win.window = win.self = win.top = win;
  vm.runInNewContext(betaJs, win);
  const click = () => {
    let prevented = false;
    for (const f of clicks) f({ target: { closest: (sel: string) => (sel.includes("apps.apple.com/app/id6825177856") ? {} : null) }, preventDefault: () => (prevented = true) });
    return prevented;
  };
  return { click, events, fetches };
}

const iPhone = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 Version/26.1 Mobile/15E148 Safari/604.1", platform: "iPhone", maxTouchPoints: 5 };
const iPadOS = { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.1 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5 };
const mac = { ...iPadOS, maxTouchPoints: 0 };
const android = { userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36", platform: "Linux armv8l", maxTouchPoints: 5 };
const windows = { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36", platform: "Win32", maxTouchPoints: 0 };

test("App Store clicks go straight to the listing on every device and record the open", () => {
  for (const nav of [iPhone, iPadOS, mac, android, windows]) {
    const b = loadBeta(nav);
    assert.equal(b.click(), false, nav.platform);
    assert.ok(b.events.includes("testflight_open"));
    assert.deepEqual(b.fetches, []);
  }
});

test("the email sheet posts to /api/beta with the honeypot and reports the request", () => {
  assert.match(betaJs, /fetch\("\/api\/beta"/);
  assert.match(betaJs, /type="email" name="email"/);
  assert.match(betaJs, /name="website"/);
  assert.match(betaJs, /website:sh\.website\.value/);
  assert.match(betaJs, /ev\("beta_link_requested"\)/);
  assert.match(betaJs, /t\("Check your email on your iPhone\."\)/);
  assert.doesNotMatch(betaJs, /fetch\("\/api\/founding",\{method/);
});

test("the email sheet loads Turnstile with the founding siteKey and posts its token", () => {
  assert.match(betaJs, /fetch\("\/api\/founding"\)\.then\(r=>r\.ok\?r\.json\(\):null\)\.then\(j=>\{if\(!j\|\|!j\.siteKey\)return;/);
  assert.match(betaJs, /w\.className="cf-turnstile";w\.dataset\.sitekey=j\.siteKey/);
  assert.match(betaJs, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(betaJs, /turnstile:\(sh\.querySelector\('\[name="cf-turnstile-response"\]'\)\|\|\{\}\)\.value/);
  assert.match(betaJs, /window\.turnstile&&window\.turnstile\.reset\(\)/);
});

test("beta.js loads Vercel analytics once and sends launch events only on success", () => {
  const js = readFileSync(join(__dirname, "../../public/d8/beta.js"), "utf8");
  assert.match(js, /querySelector\('script\[src="\/_vercel\/insights\/script\.js"\]'\)/);
  assert.match(js, /UTM=T0\.s\|\|"direct"/);
  assert.match(js, /sendBeacon\("\/api\/events",b\)/);
  assert.match(js, /if\(top===self\)ev\("page_view"\)/);
  assert.match(js, /a\[href\^="https:\/\/apps\.apple\.com\/app\/id6825177856"\]'\)\)ev\("testflight_open"\)/);
  assert.doesNotMatch(js, /testflight\.apple\.com/);
});

const foundingJs = readFileSync(join(__dirname, "../../public/d8/founding.js"), "utf8");
const homeHtml = readFileSync(join(__dirname, "../../public/d8/index.html"), "utf8");

async function loadOffer(lang: string, status: unknown) {
  const row = () => {
    const count = { textContent: "" };
    return { hidden: true, count, querySelector: (sel: string) => (sel === ".ffn" ? count : { addEventListener: () => {} }) };
  };
  const rows = [row(), row()];
  const win: Record<string, unknown> = {
    document: { documentElement: { lang }, querySelectorAll: () => rows },
    fetch: async () => new Response(JSON.stringify(status)),
    addEventListener: () => {},
    setTimeout: () => 0,
  };
  win.window = win;
  vm.runInNewContext(foundingJs, win);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  return rows;
}

test("the home page carries the founding family offer under both App Store buttons", () => {
  const offers = [...homeHtml.matchAll(/data-slot="appstore" rel="noopener">Download on the App Store<\/a>\s*<p class="hw ff" hidden><button type="button">([^<]+)<span class="ffn"><\/span><\/button><\/p>/g)];
  assert.equal(offers.length, 2);
  for (const o of offers) assert.equal(o[1], "Founding family, free for life · ");
  assert.match(homeHtml, /<script src="\/d8\/founding\.js"><\/script>/);
});

test("the offer shows the live count once founding signups are open", async () => {
  const rows = await loadOffer("en", { total: 500, left: 417, siteKey: "k" });
  for (const r of rows) {
    assert.equal(r.hidden, false);
    assert.equal(r.count.textContent, "417 of 500 left");
  }
  assert.equal((await loadOffer("en", { total: 500, left: 0 }))[0].count.textContent, "All 500 spots are taken");
});

test("the offer stays hidden while signups are offline and on translated pages", async () => {
  assert.equal((await loadOffer("en", { open: false }))[0].hidden, true);
  assert.equal((await loadOffer("es", { total: 500, left: 417 }))[0].hidden, true);
});

test("the offer sheet states the ruling and posts the claim with the human check", () => {
  assert.match(foundingJs, /const HEAD = "Founding family, free for life";/);
  assert.ok(foundingJs.includes(`const OFFER = "${OFFER}";`));
  assert.match(foundingJs, /note\.textContent = "Check your email for your founding family link\.";/);
  assert.doesNotMatch(foundingJs, /Your spot is saved|already confirmed|j\.confirmed/);
  assert.match(foundingJs, /fetch\("\/api\/founding", \{ method: "POST"/);
  assert.match(foundingJs, /turnstile: token/);
  assert.match(foundingJs, /website: sheet\.website\.value/);
  assert.doesNotMatch(foundingJs, /[—–]/);
});
