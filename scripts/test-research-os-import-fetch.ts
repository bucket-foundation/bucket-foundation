import test from "node:test";
import assert from "node:assert/strict";
import { htmlToText, isPublicHttpUrl } from "../src/lib/research-os/import-fetch";

test("isPublicHttpUrl accepts public http(s) and rejects local and private hosts", () => {
  assert.equal(isPublicHttpUrl("https://en.wikipedia.org/wiki/Rayleigh_scattering"), true);
  assert.equal(isPublicHttpUrl("http://example.com/a"), true);
  assert.equal(isPublicHttpUrl("ftp://example.com/a"), false);
  assert.equal(isPublicHttpUrl("http://localhost:3100/x"), false);
  assert.equal(isPublicHttpUrl("http://127.0.0.1:54321/rest"), false);
  assert.equal(isPublicHttpUrl("http://10.0.0.5/"), false);
  assert.equal(isPublicHttpUrl("http://192.168.1.1/"), false);
  assert.equal(isPublicHttpUrl("http://169.254.169.254/latest"), false);
  assert.equal(isPublicHttpUrl("http://[::1]/"), false);
  assert.equal(isPublicHttpUrl("not a url"), false);
});

test("htmlToText drops scripts and tags, decodes entities, keeps block breaks", () => {
  const html = "<html><head><title>T</title><style>p{}</style><script>x()</script></head><body><h1>Sky</h1><p>Blue &amp; violet scatter <b>more</b>.</p><p>Second&nbsp;line.</p></body></html>";
  assert.equal(htmlToText(html), "T\nSky\nBlue & violet scatter more.\nSecond line.");
});
