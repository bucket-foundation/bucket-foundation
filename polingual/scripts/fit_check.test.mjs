import test from "node:test";
import assert from "node:assert/strict";
import { fitCheck } from "./fit_check.mjs";

const URL = process.env.POLINGUAL_URL;

test("the home fits one screen with the Join button fully visible at 30 viewports", { skip: !URL && "set POLINGUAL_URL to a running polingual dev server" }, async () => {
  for (const r of await fitCheck(URL)) {
    assert.ok(r.doc <= r.h + 1, `${r.w}x${r.h}: document ${r.doc}px tall`);
    assert.ok(r.docW <= r.w, `${r.w}x${r.h}: document ${r.docW}px wide`);
    assert.ok(r.button, `${r.w}x${r.h}: Join button not fully visible`);
  }
});
