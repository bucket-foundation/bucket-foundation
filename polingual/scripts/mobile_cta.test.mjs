import test from "node:test";
import assert from "node:assert/strict";
import { mobileCta, mobileSizes } from "./mobile_cta.mjs";

const URL = process.env.POLINGUAL_URL;

test("the TestFlight button and footer show at every mobile size from 320x568 to 640x1400", { skip: !URL && "set POLINGUAL_URL to a running polingual dev server" }, async () => {
  for (const r of await mobileCta(URL, mobileSizes())) {
    assert.ok(r.button, `button hidden at ${r.w}x${r.h}`);
    assert.ok(r.footer, `footer hidden at ${r.w}x${r.h}`);
  }
});
