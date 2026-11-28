import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { START_DAY, dayIndex, themeCss, type Brand } from "../src/lib/daily-theme";

const root = path.join(__dirname, "..");
const brands: Brand[] = JSON.parse(fs.readFileSync(path.join(root, "public/brand/daily/brands.json"), "utf8"));
const at = (day: number) => new Date(day * 86400000 + 3600000);

test("the start day shows the top ranked brand and each day moves one rank", () => {
  assert.equal(dayIndex(at(START_DAY), brands.length), 0);
  assert.equal(dayIndex(at(START_DAY + 1), brands.length), 1);
  assert.equal(dayIndex(at(START_DAY + brands.length), brands.length), 0);
  assert.equal(dayIndex(at(START_DAY - 1), brands.length), brands.length - 1);
});

test("every daily brand has a shipped logo and a full theme", () => {
  for (const b of brands) {
    assert.ok(fs.existsSync(path.join(root, "public", b.logo)), b.logo);
    assert.ok(b.fonts.href.startsWith("https://fonts.googleapis.com/"), b.id);
    for (const role of ["bg", "text", "accent", "link"]) assert.match(themeCss(b), new RegExp(`--bk-${role}: #`), `${b.id} ${role}`);
  }
});
