import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatStars } from "../src/lib/format-stars";

const root = path.join(__dirname, "..");
const BUTTON = fs.readFileSync(path.join(root, "src/components/GitHubStarButton.tsx"), "utf8");
const HEADER = fs.readFileSync(path.join(root, "src/components/Header.tsx"), "utf8");

test("button links to the public repo in a new tab", () => {
  assert.match(BUTTON, /GITHUB_URL = "https:\/\/github\.com\/bucket-foundation\/bucket-foundation"/);
  assert.match(BUTTON, /href=\{GITHUB_URL\}/);
  assert.match(BUTTON, /target="_blank"/);
  assert.match(BUTTON, /rel="noopener noreferrer"/);
});

test("header renders the button before the user menu", () => {
  const button = HEADER.indexOf("<GitHubStarButton />");
  const menu = HEADER.indexOf("<UserMenu");
  assert.ok(button > 0 && menu > button);
});

test("star counts format like the OpenScriva button", () => {
  assert.equal(formatStars(0), "0");
  assert.equal(formatStars(999), "999");
  assert.equal(formatStars(1234), "1.2k");
});
