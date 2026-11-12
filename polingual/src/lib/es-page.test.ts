import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const d8 = join(__dirname, "../../public/d8");
const es = readFileSync(join(d8, "es.html"), "utf8");
const en = readFileSync(join(d8, "index.html"), "utf8");

test("es page is Spanish and canonical at /es", () => {
  assert.match(es, /<html lang="es">/);
  assert.match(es, /<link rel="canonical" href="https:\/\/www\.polingual\.com\/es">/);
  assert.match(es, /tercer<\/em> idioma/);
  assert.ok(!/Join the beta|Language learning|day streak/.test(es.replace(/<script>window\.PL_TR=.*?<\/script>/s, "")));
});

test("both pages pair through hreflang", () => {
  for (const html of [en, es]) {
    assert.match(html, /hreflang="en-US" href="https:\/\/www\.polingual\.com\/"/);
    assert.match(html, /hreflang="es-US" href="https:\/\/www\.polingual\.com\/es"/);
  }
});

test("es keeps the Bucket beta call to action", () => {
  assert.match(es, /testflight\.apple\.com\/join\/B1ctUxn5/);
});

test("/es rewrites to the generated page", async () => {
  const { default: config } = await import("../../next.config.js");
  const r = await config.rewrites();
  assert.ok(r.beforeFiles.some((x: { source: string; destination: string }) => x.source === "/es" && x.destination === "/d8/es.html"));
});

test("Spanish page carries Spanish beta strings", () => {
  assert.match(es, /window\.PL_TR=\{[^<]*"Join the beta": "Únete a la beta"/);
});

const langs: string[] = JSON.parse(readFileSync(join(__dirname, "site-langs.json"), "utf8"));
const keys = JSON.parse(readFileSync(join(__dirname, "../../scripts/i18n/keys.json"), "utf8"));

test("every site language has a page, a rewrite, an hreflang and the phone layout", async () => {
  const { default: config } = await import("../../next.config.js");
  const r = await config.rewrites();
  assert.ok(langs.length >= 20, `only ${langs.length} languages`);
  for (const l of langs) {
    const html = readFileSync(join(d8, `${l}.html`), "utf8");
    assert.match(html, new RegExp(`<html lang="${l}">`));
    assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.polingual\\.com/${l}">`));
    assert.match(html, /id="app"/);
    assert.match(html, new RegExp(`<option value="/${l}" lang="${l}" selected>`));
    assert.match(en, new RegExp(`hreflang="[^"]+" href="https://www\\.polingual\\.com/${l}"`));
    assert.ok(r.beforeFiles.some((x: { source: string; destination: string }) => x.source === `/${l}` && x.destination === `/d8/${l}.html`), l);
  }
});

test("no English page string is left on a translated page", () => {
  for (const l of langs) {
    const html = readFileSync(join(d8, `${l}.html`), "utf8");
    const page: Record<string, string> = JSON.parse(readFileSync(join(__dirname, `../../scripts/i18n/${l}.json`), "utf8")).page;
    for (const k of keys.page as string[]) if (page[k] !== k) assert.ok(!html.includes(k), `${l} still has ${k}`);
  }
});

test("every translated page carries the iPhone link sheet strings in PL_TR", () => {
  const sheet = ["Polingual is on iPhone. Send yourself the link.", "Email", "Send me the link", "Check your email on your iPhone.", "Close"];
  for (const k of sheet) assert.ok((keys.modal as string[]).includes(k), k);
  for (const l of langs) {
    const html = readFileSync(join(d8, `${l}.html`), "utf8");
    const tr = JSON.parse(html.match(/<script>window\.PL_TR=(.*?)<\/script>/s)![1].replace(/<\\\//g, "</"));
    for (const k of sheet) assert.ok(tr[k] && (k === "Email" || tr[k] !== k), `${l} lacks ${k}`);
  }
  assert.match(es, /"Check your email on your iPhone\.": "Revisa tu correo en tu iPhone\."/);
});
