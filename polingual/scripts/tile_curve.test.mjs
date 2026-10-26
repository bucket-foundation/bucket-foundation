import test from "node:test";
import assert from "node:assert/strict";
import { tileCurve } from "./tile_curve.mjs";

const URL = process.env.POLINGUAL_URL;

test("hero tile size changes without jumps from 1920 to 641 wide", { skip: !URL && "set POLINGUAL_URL to a running polingual dev server" }, async () => {
  for (const height of [720, 900, 1080]) {
    const rows = await tileCurve(URL, { height });
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1].tile, b = rows[i].tile;
      assert.ok(Math.abs(b - a) <= Math.max(12, a * 0.12), `${rows[i].w}x${height}: ${a} to ${b}`);
    }
  }
});
