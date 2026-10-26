import test from "node:test";
import assert from "node:assert/strict";
import { tileCurve } from "./tile_curve.mjs";

const URL = process.env.POLINGUAL_URL;

test("hero tile width never grows as the window narrows from 1920 to 641", { skip: !URL && "set POLINGUAL_URL to a running polingual dev server" }, async () => {
  const rows = await tileCurve(URL);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].tile <= rows[i - 1].tile + 0.5, `${rows[i].w}px: ${rows[i].tile} after ${rows[i - 1].tile}`);
  assert.equal(rows[0].tile, 176);
});
