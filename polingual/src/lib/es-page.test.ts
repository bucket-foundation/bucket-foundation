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
  assert.ok(!/Join the beta|Language learning|day streak/.test(es));
});

test("both pages pair through hreflang", () => {
  for (const html of [en, es]) {
    assert.match(html, /hreflang="en-US" href="https:\/\/www\.polingual\.com\/"/);
    assert.match(html, /hreflang="es-US" href="https:\/\/www\.polingual\.com\/es"/);
  }
});

test("es keeps the Bucket beta call to action", () => {
  assert.match(es, /testflight\.apple\.com\/join\/HfeRBKr8/);
});

test("/es rewrites to the generated page", async () => {
  const { default: config } = await import("../../next.config.js");
  const r = await config.rewrites();
  assert.ok(r.beforeFiles.some((x: { source: string; destination: string }) => x.source === "/es" && x.destination === "/d8/es.html"));
});

test("beta modal speaks Spanish on Spanish pages", () => {
  const js = readFileSync(join(d8, "beta.js"), "utf8");
  assert.match(js, /documentElement\.lang==="es"/);
  assert.match(js, /Únete a la beta/);
});
