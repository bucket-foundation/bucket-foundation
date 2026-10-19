import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { avatarInitial, nextIndex, pillHidden, pillItems } from "../src/lib/account-pill";

const root = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

test("signed out shows Sign in only", () => {
  assert.deepEqual(pillItems(false).map((i) => i.label), ["Sign in"]);
  assert.equal(pillItems(false)[0].kind, "sign-in");
});

test("signed in shows Settings, Profile, Sign out", () => {
  const items = pillItems(true);
  assert.deepEqual(items.map((i) => i.label), ["Settings", "Profile", "Sign out"]);
  assert.deepEqual(items.flatMap((i) => (i.kind === "link" ? [i.href] : [])), ["/settings", "/account"]);
});

test("pill stays off the frozen study and placement screens", () => {
  assert.equal(pillHidden("/research-os/learn/03-chemistry/place"), true);
  assert.equal(pillHidden("/research-os/learn"), true);
  assert.equal(pillHidden("/sign-in"), true);
  assert.equal(pillHidden("/"), false);
  assert.equal(pillHidden("/research-os/learning"), false);
  assert.equal(pillHidden("/canon"), false);
});

test("avatar initial comes from the email", () => {
  assert.equal(avatarInitial("ada@x.org"), "A");
  assert.equal(avatarInitial(null), "");
  assert.equal(avatarInitial("@x"), "");
});

test("arrow keys wrap through the menu", () => {
  assert.equal(nextIndex(2, "ArrowDown", 3), 0);
  assert.equal(nextIndex(0, "ArrowUp", 3), 2);
  assert.equal(nextIndex(1, "Home", 3), 0);
  assert.equal(nextIndex(0, "End", 3), 2);
  assert.equal(nextIndex(1, "x", 3), 1);
});

test("pill is a menu button that closes on Escape and reuses the sign-in modal", () => {
  const pill = read("src/components/auth/AccountPill.tsx");
  assert.match(pill, /aria-haspopup="menu"/);
  assert.match(pill, /aria-expanded=\{open\}/);
  assert.match(pill, /role="menu"/);
  assert.match(pill, /"Escape"/);
  assert.match(pill, /openSignIn\(\)/);
  assert.match(pill, /status\?\.badge/);
  assert.match(pill, /status\?\.row/);
  assert.match(read("src/components/auth/UserMenuV2.tsx"), /pillHidden\(pathname\)/);
});

test("settings page shows the email and a sign out button", () => {
  const page = read("src/app/settings/page.tsx");
  assert.match(page, /user\.email/);
  assert.match(page, /action="\/auth\/sign-out"/);
  assert.match(page, />\s*Sign out\s*</);
});
