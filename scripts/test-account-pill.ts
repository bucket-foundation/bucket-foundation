import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { avatarInitial, nextIndex, pillHidden, pillItems } from "../src/lib/account-pill";
import { syncView } from "../src/lib/academy/sync-status";

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

test("sync row reads synced, waiting with a count, or offline, and offers Sync now when it can", () => {
  const base = { pending: 0, online: true, syncing: false, signedIn: true };
  assert.deepEqual(syncView(base), { state: "synced", label: "Synced", badge: false, canSync: true });
  assert.deepEqual(syncView({ ...base, pending: 1 }), { state: "waiting", label: "1 change waiting to sync", badge: true, canSync: true });
  assert.equal(syncView({ ...base, pending: 3 }).label, "3 changes waiting to sync");
  assert.deepEqual(syncView({ ...base, pending: 2, online: false }), { state: "offline", label: "Offline, 2 changes waiting to sync", badge: true, canSync: false });
  assert.equal(syncView({ ...base, syncing: true, pending: 2 }).canSync, false);
  assert.equal(syncView({ ...base, signedIn: false }).state, "idle");
  assert.deepEqual(syncView({ ...base, signedIn: false, pending: 2 }), { state: "waiting", label: "2 changes waiting to sync", badge: true, canSync: false });
});

test("the pill carries the sync status and stays off the frozen screens", () => {
  const menu = read("src/components/auth/UserMenuV2.tsx");
  assert.match(menu, /if \(!drawer && !pillHidden\(pathname\)\) return <SyncedAccountPill \/>/);
  const synced = read("src/components/auth/SyncedAccountPill.tsx");
  assert.match(synced, /Sync now/);
  assert.match(synced, /role="status"/);
  assert.match(read("src/components/academy/useSyncStatus.ts"), /reviewSync\.flush\(\)/);
});
