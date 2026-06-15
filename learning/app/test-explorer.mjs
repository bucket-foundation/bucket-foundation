/* Headless (real Chrome / CDP) smoke test of the Polingual word explorer (bkt-nhy).
 *
 * Boots a static server over learning/app, launches headless chromium, and drives
 * the real UI through the Languages branch into the explorer:
 *   • opens the explorer, looks up "light"
 *   • asserts a result card renders (surface + ipa + gloss)
 *   • asserts the MEANING lens shows CROSS-LINGUAL neighbors (>=2 distinct langs,
 *     at least one different from the source lang)
 *   • asserts SOUND, SPELLING, ETYMOLOGY, TRANSLATIONS lenses each render content
 *   • taps a neighbor and asserts navigation to a new word
 *   • asserts the CC-BY-SA attribution is visible
 *   • asserts ZERO console errors throughout
 *   • writes a screenshot to /tmp/polingual-explorer.png
 *
 * Pure Node + `ws` (already a dep) speaking the Chrome DevTools Protocol — no
 * puppeteer/playwright. Dev-only; excluded from the shipped /academy-app bundle.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const here = dirname(fileURLToPath(import.meta.url));
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".bin": "application/octet-stream",
  ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json",
};

function fail(msg) { console.error("FAIL:", msg); process.exitCode = 1; throw new Error(msg); }
function ok(msg) { console.log("  PASS", msg); }

/* ---- static server ---- */
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = join(here, p);
  if (!existsSync(file) || !file.startsWith(here)) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

/* ---- minimal CDP client over ws ---- */
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach((fn) => fn(msg));
    }
  });
  const ready = new Promise((r) => ws.on("open", r));
  return {
    ready,
    on: (fn) => listeners.push(fn),
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const mid = ++id;
        pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
      }),
    close: () => ws.close(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log("server:", base);

  const bin = existsSync("/usr/bin/chromium-browser") ? "/usr/bin/chromium-browser" : "/usr/bin/google-chrome";
  const userDir = `/tmp/polingual-chrome-${process.pid}`;
  const dbgPort = 9222 + (process.pid % 2000);
  const chrome = spawn(bin, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
    "--disable-dev-shm-usage", `--remote-debugging-port=${dbgPort}`, `--user-data-dir=${userDir}`,
    "--window-size=430,1400", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  // wait for the devtools http endpoint, then grab the PAGE target's ws url
  let wsUrl = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${dbgPort}/json`);
      const targets = await r.json();
      const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(200);
  }
  if (!wsUrl) fail("could not find a page target ws url");

  const c = cdp(wsUrl);
  await c.ready;

  const consoleErrors = [];
  c.on((msg) => {
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error")
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description || "").join(" "));
    if (msg.method === "Runtime.exceptionThrown")
      consoleErrors.push("EXCEPTION: " + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || ""));
  });

  await c.send("Page.enable");
  await c.send("Runtime.enable");

  // boot straight onto the Languages branch, explorer view
  const url = `${base}/index.html?branch=lang-core&onboard=0`;
  await c.send("Page.navigate", { url });
  await sleep(1500);

  const evalJs = async (expr) => {
    const r = await c.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval threw: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };

  // sanity: app booted
  const booted = await evalJs(`!!document.querySelector(".topbar")`);
  if (!booted) fail("app did not boot");
  ok("app booted on Languages branch");

  // open the explorer via the entry CTA (must exist on the lang study screen)
  await evalJs(`(function(){var b=document.querySelector(".explore-cta"); if(b) b.click(); return !!b;})()`);
  // if the CTA wasn't on the home, go to study then click
  await sleep(300);
  let hasExplorer = await evalJs(`!!document.querySelector(".explorer")`);
  if (!hasExplorer) {
    // navigate: home -> study -> explore CTA
    await evalJs(`(function(){var t=[...document.querySelectorAll(".tab")].find(x=>/learn/i.test(x.textContent)); if(t)t.click();})()`);
    await sleep(200);
    await evalJs(`(function(){var c=document.querySelector(".study-cta,.btn.primary"); if(c)c.click();})()`);
    await sleep(300);
    await evalJs(`(function(){var b=document.querySelector(".explore-cta"); if(b)b.click();})()`);
    await sleep(400);
    hasExplorer = await evalJs(`!!document.querySelector(".explorer")`);
  }
  if (!hasExplorer) fail("explorer screen did not open");
  ok("explorer screen opened from Languages branch");

  // wait for the engine asset to load
  for (let i = 0; i < 40; i++) {
    if (await evalJs(`!!(window.Polingual && window.Polingual.ready())`)) break;
    await sleep(150);
  }
  if (!(await evalJs(`window.Polingual.ready()`))) fail("Polingual asset never loaded");
  ok("starter asset loaded (" + (await evalJs(`window.Polingual.manifest().words`)) + " words, " +
     (await evalJs(`window.Polingual.manifest().languages.length`)) + " langs)");

  // look up "light"
  await evalJs(`(function(){var i=document.querySelector(".xpl-input"); i.value="light"; document.querySelector(".xpl-search").dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}));})()`);
  await sleep(400);
  const card = await evalJs(`(function(){var c=document.querySelector(".xpl-card"); if(!c)return null; return {surface:(c.querySelector(".xpl-surface")||{}).textContent, ipa:!!c.querySelector(".xpl-ipa"), gloss:(c.querySelector(".xpl-gloss")||{}).textContent};})()`);
  if (!card) fail('no result card for "light"');
  ok(`result card: ${card.surface}  ipa=${card.ipa}  gloss="${(card.gloss||"").slice(0,40)}"`);

  // MEANING lens — must be cross-lingual
  const meaning = await evalJs(`(function(){
    var rows=[...document.querySelectorAll(".xpl-panel .xpl-row")];
    return rows.map(function(r){return {lang:(r.querySelector(".xpl-row-lang")||{}).textContent, surf:(r.querySelector(".xpl-row-surface")||{}).textContent};});
  })()`);
  if (!meaning.length) fail("meaning lens empty");
  const srcLang = await evalJs(`(document.querySelector(".xpl-meta .xpl-lang")||{}).textContent`);
  const langsSeen = new Set(meaning.map((r) => r.lang));
  const crossLingual = meaning.some((r) => r.lang && r.lang !== srcLang);
  if (langsSeen.size < 2 || !crossLingual)
    fail("meaning neighbors not cross-lingual: " + JSON.stringify(meaning.slice(0, 6)));
  ok(`meaning lens cross-lingual: ${meaning.length} neighbors across ${langsSeen.size} langs (e.g. ${meaning.slice(0,3).map(r=>r.lang+":"+r.surf).join(", ")})`);

  // SOUND lens
  await evalJs(`(function(){var t=[...document.querySelectorAll(".xpl-tab")].find(x=>/sound/i.test(x.textContent)); if(t)t.click();})()`);
  await sleep(250);
  const sound = await evalJs(`document.querySelectorAll(".xpl-panel .xpl-row").length || (document.querySelector(".xpl-lens-empty")? -1 : 0)`);
  if (sound === 0) fail("sound lens rendered nothing (no rows, no empty state)");
  ok("sound lens rendered (" + (sound > 0 ? sound + " rows" : "honest empty state") + ")");

  // SPELLING lens
  await evalJs(`(function(){var t=[...document.querySelectorAll(".xpl-tab")].find(x=>/spelling/i.test(x.textContent)); if(t)t.click();})()`);
  await sleep(250);
  const spelling = await evalJs(`document.querySelectorAll(".xpl-panel .xpl-row").length || (document.querySelector(".xpl-lens-empty")?-1:0)`);
  if (spelling === 0) fail("spelling lens rendered nothing");
  ok("spelling lens rendered (" + (spelling > 0 ? spelling + " rows" : "empty state") + ")");

  // ETYMOLOGY lens
  await evalJs(`(function(){var t=[...document.querySelectorAll(".xpl-tab")].find(x=>/etymology/i.test(x.textContent)); if(t)t.click();})()`);
  await sleep(250);
  const ety = await evalJs(`!!(document.querySelector(".xpl-ety")||document.querySelector(".xpl-lens-empty"))`);
  if (!ety) fail("etymology lens rendered nothing");
  ok("etymology lens rendered");

  // TRANSLATIONS lens
  await evalJs(`(function(){var t=[...document.querySelectorAll(".xpl-tab")].find(x=>/translation/i.test(x.textContent)); if(t)t.click();})()`);
  await sleep(250);
  const trans = await evalJs(`document.querySelectorAll(".xpl-panel .xpl-row").length || (document.querySelector(".xpl-lens-empty")?-1:0)`);
  if (trans === 0) fail("translations lens rendered nothing");
  ok("translations lens rendered (" + (trans > 0 ? trans + " langs" : "empty state") + ")");

  // neighbor tap navigates — go back to meaning, tap a neighbor whose
  // (lang,surface) differs from the current word, and assert we land on it.
  await evalJs(`(function(){var t=[...document.querySelectorAll(".xpl-tab")].find(x=>/meaning/i.test(x.textContent)); if(t)t.click();})()`);
  await sleep(250);
  const before = await evalJs(`(function(){return {surf:(document.querySelector(".xpl-surface")||{}).textContent, lang:(document.querySelector(".xpl-meta .xpl-lang")||{}).textContent};})()`);
  const target = await evalJs(`(function(){
    var rows=[...document.querySelectorAll(".xpl-panel .xpl-row")];
    var cur=${JSON.stringify(before)};
    var r=rows.find(function(x){
      var s=(x.querySelector(".xpl-row-surface")||{}).textContent, l=(x.querySelector(".xpl-row-lang")||{}).textContent;
      return s!==cur.surf || l!==cur.lang;
    }) || rows[0];
    var s=(r.querySelector(".xpl-row-surface")||{}).textContent, l=(r.querySelector(".xpl-row-lang")||{}).textContent;
    r.click();
    return {surf:s, lang:l};
  })()`);
  await sleep(350);
  const after = await evalJs(`(function(){return {surf:(document.querySelector(".xpl-surface")||{}).textContent, lang:(document.querySelector(".xpl-meta .xpl-lang")||{}).textContent};})()`);
  const moved = (after.surf !== before.surf || after.lang !== before.lang);
  const landed = (after.surf === target.surf);
  if (!moved || !landed)
    fail(`neighbor tap did not navigate (${before.lang}:${before.surf} -> ${after.lang}:${after.surf}, expected ${target.lang}:${target.surf})`);
  ok(`neighbor tap navigated: ${before.lang}:"${before.surf}" -> ${after.lang}:"${after.surf}"`);

  // attribution visible
  const attrib = await evalJs(`(function(){var a=document.querySelector(".xpl-attrib"); if(!a)return null; var t=a.textContent||""; return /CC-BY-SA/i.test(t) && /Wiktionary/i.test(t) && /Kaikki/i.test(t);})()`);
  if (!attrib) fail("CC-BY-SA / Wiktionary / Kaikki attribution not visible");
  ok("attribution visible (Wiktionary via Kaikki, CC-BY-SA)");

  // screenshot
  await evalJs(`(function(){var t=[...document.querySelectorAll(".xpl-tab")].find(x=>/meaning/i.test(x.textContent)); if(t)t.click(); window.scrollTo(0,0);})()`);
  await sleep(250);
  const shot = await c.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync("/tmp/polingual-explorer.png", Buffer.from(shot.data, "base64"));
  ok("screenshot written to /tmp/polingual-explorer.png");

  // zero console errors
  if (consoleErrors.length) {
    console.error("CONSOLE ERRORS:\n" + consoleErrors.join("\n"));
    fail(consoleErrors.length + " console error(s)");
  }
  ok("zero console errors");

  c.close();
  chrome.kill("SIGKILL");
  server.close();
  console.log("\nEXPLORER SMOKE PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  try { server.close(); } catch {}
  setTimeout(() => process.exit(process.exitCode || 0), 200);
});
