import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STONE_MARK_PATH } from "./stone-mark";

const here = import.meta.dir;

test("brand tokens file matches the app tokens", () => {
  expect(readFileSync(resolve(here, "../../../brand/stonepunk/tokens.css"), "utf8")).toBe(readFileSync(resolve(here, "stone-tokens.css"), "utf8"));
});

test("brand mark svg carries the app mark path", () => {
  expect(readFileSync(resolve(here, "../../../brand/stonepunk/mark.svg"), "utf8")).toContain(STONE_MARK_PATH);
});
