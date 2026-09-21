/**
 * Tests for the launch list: signup validation, the per-address record,
 * CSV export, the file store, the list key check, and when /sign-in shows
 * the list. node:test, no network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { csvCell, mergeEntry, normalizeEmail, parseEntry, parseSignup, sortEntries, toCsv, type WaitlistEntry } from "../src/lib/waitlist/core";
import { adminKeyMatches, emailKey, fileStore, getWaitlistStore, listSignups, saveSignup, waitlistPrefix } from "../src/lib/waitlist/store";
import { signInOpen } from "../src/lib/launch";

test("normalizeEmail trims, lowercases, and rejects malformed addresses", () => {
  assert.equal(normalizeEmail("  Ada@Example.ORG "), "ada@example.org");
  assert.equal(normalizeEmail("a.b+tag@sub.example.co.uk"), "a.b+tag@sub.example.co.uk");
  for (const bad of ["", "ada", "ada@", "@example.org", "ada@example", "ada@@example.org", "a b@example.org", "ada@-example.org", "ada@example..org", 42, null]) {
    assert.equal(normalizeEmail(bad), null, String(bad));
  }
  assert.equal(normalizeEmail("a".repeat(65) + "@example.org"), null);
  assert.equal(normalizeEmail("a@" + "b".repeat(250) + ".org"), null);
});

test("parseSignup keeps valid fields, drops unknown roles, and flags the honeypot", () => {
  const ok = parseSignup({ email: "Ada@Example.org", name: "  Ada \n Lovelace ", role: "Teacher", wanted: "/research-os/workspace?x=1" });
  assert.deepEqual(ok, { ok: true, input: { email: "ada@example.org", name: "Ada Lovelace", role: "teacher", wanted: "/research-os/workspace?x=1" }, suspect: false });

  const loose = parseSignup({ email: "ada@example.org", role: "wizard", wanted: "https://evil.example/", name: "x".repeat(200) });
  assert.equal(loose.ok, true);
  if (loose.ok) {
    assert.equal(loose.input.role, null);
    assert.equal(loose.input.wanted, null);
    assert.equal(loose.input.name?.length, 80);
  }
  const offsite = parseSignup({ email: "ada@example.org", wanted: "//evil.example" });
  assert.equal(offsite.ok && offsite.input.wanted, null);

  assert.deepEqual(parseSignup({ email: "nope" }), { ok: false, error: "Enter a valid email address." });
  assert.deepEqual(parseSignup(null), { ok: false, error: "Enter a valid email address." });
  const held = parseSignup({ email: "ada@example.org", website: "http://spam.example" });
  assert.equal(held.ok && held.suspect, true);
  assert.equal(held.ok && held.input.email, "ada@example.org");
});

test("mergeEntry keeps the first signup time and lets newer answers win", () => {
  const first = mergeEntry(null, { email: "ada@example.org", name: "Ada", role: null, wanted: "/research-os/home" }, "2026-09-21T10:00:00.000Z");
  assert.deepEqual(first, {
    email: "ada@example.org",
    name: "Ada",
    role: null,
    wanted: "/research-os/home",
    created_at: "2026-09-21T10:00:00.000Z",
    updated_at: "2026-09-21T10:00:00.000Z",
    signups: 1,
  });
  const again = mergeEntry(first, { email: "ada@example.org", name: null, role: "researcher", wanted: null }, "2026-09-22T10:00:00.000Z");
  assert.equal(again.created_at, "2026-09-21T10:00:00.000Z");
  assert.equal(again.updated_at, "2026-09-22T10:00:00.000Z");
  assert.equal(again.name, "Ada");
  assert.equal(again.role, "researcher");
  assert.equal(again.wanted, "/research-os/home");
  assert.equal(again.signups, 2);
});

test("parseEntry reads stored records and rejects broken ones", () => {
  assert.equal(parseEntry(null), null);
  assert.equal(parseEntry({ email: "bad" , created_at: "x" }), null);
  assert.equal(parseEntry({ email: "ada@example.org" }), null);
  const e = parseEntry({ email: "ada@example.org", created_at: "2026-09-21T10:00:00.000Z", role: "wizard", signups: -3 });
  assert.deepEqual(e, {
    email: "ada@example.org",
    name: null,
    role: null,
    wanted: null,
    created_at: "2026-09-21T10:00:00.000Z",
    updated_at: "2026-09-21T10:00:00.000Z",
    signups: 1,
  });
});

test("csv quotes every cell and defuses formulas", () => {
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(3), '"3"');
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
  assert.equal(csvCell("+1"), `"'+1"`);
  assert.equal(csvCell("-1"), `"'-1"`);
  assert.equal(csvCell("@x"), `"'@x"`);
  const entry: WaitlistEntry = { email: "ada@example.org", name: "Ada, L", role: "teacher", wanted: null, created_at: "2026-09-21T10:00:00.000Z", updated_at: "2026-09-21T10:00:00.000Z", signups: 1 };
  assert.equal(
    toCsv([entry]),
    'email,name,role,wanted,created_at,updated_at,signups\r\n"ada@example.org","Ada, L","teacher","","2026-09-21T10:00:00.000Z","2026-09-21T10:00:00.000Z","1"\r\n',
  );
});

test("sortEntries puts the newest signup first", () => {
  const mk = (email: string, created_at: string): WaitlistEntry => ({ email, name: null, role: null, wanted: null, created_at, updated_at: created_at, signups: 1 });
  const sorted = sortEntries([mk("a@x.org", "2026-09-01T00:00:00Z"), mk("b@x.org", "2026-09-03T00:00:00Z"), mk("c@x.org", "2026-09-02T00:00:00Z")]);
  assert.deepEqual(sorted.map((e) => e.email), ["b@x.org", "c@x.org", "a@x.org"]);
});

test("file store round-trips signups, one record per address", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "waitlist-test-"));
  try {
    const store = fileStore(root, "waitlist-local/");
    assert.deepEqual(await listSignups(store), []);
    assert.equal(await saveSignup(store, { email: "ada@example.org", name: "Ada", role: "teacher", wanted: null }, "2026-09-21T10:00:00.000Z"), true);
    assert.equal(await saveSignup(store, { email: "ada@example.org", name: null, role: null, wanted: "/account" }, "2026-09-21T11:00:00.000Z"), false);
    assert.equal(await saveSignup(store, { email: "emmy@example.org", name: null, role: "researcher", wanted: null }, "2026-09-21T12:00:00.000Z"), true);

    const files = await readdir(path.join(root, "waitlist-local"));
    assert.deepEqual(files.sort(), [`${emailKey("ada@example.org")}.json`, `${emailKey("emmy@example.org")}.json`].sort());

    // Suspects live under suspect/ and stay out of the list.
    const held = fileStore(root, "waitlist-local/suspect/");
    await saveSignup(held, { email: "bot@example.org", name: null, role: null, wanted: null }, "2026-09-21T13:00:00.000Z");
    assert.deepEqual((await listSignups(held)).map((e) => e.email), ["bot@example.org"]);

    // Stray and broken files are skipped.
    await writeFile(path.join(root, "waitlist-local", "notes.txt"), "x");
    await writeFile(path.join(root, "waitlist-local", `${"0".repeat(64)}.json`), "{broken");

    const list = await listSignups(store);
    assert.deepEqual(list.map((e) => [e.email, e.signups, e.name, e.role, e.wanted]), [
      ["emmy@example.org", 1, null, "researcher", null],
      ["ada@example.org", 2, "Ada", "teacher", "/account"],
    ]);
    assert.equal(list[1].created_at, "2026-09-21T10:00:00.000Z");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the store follows the environment", () => {
  assert.equal(waitlistPrefix({ VERCEL_ENV: "production" }), "waitlist/");
  assert.equal(waitlistPrefix({ VERCEL_ENV: "preview" }), "waitlist-preview/");
  assert.equal(waitlistPrefix({}), "waitlist-local/");
  assert.equal(getWaitlistStore({ VERCEL: "1", VERCEL_ENV: "production" }), null);
  assert.equal(getWaitlistStore({ VERCEL: "1", VERCEL_ENV: "production", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x_y" })?.kind, "blob");
  assert.equal(getWaitlistStore({ VERCEL_ENV: "production", BLOB_STORE_ID: "store_x" })?.kind, "blob");
  const local = getWaitlistStore({});
  assert.equal(local?.kind, "file");
  assert.equal(local?.prefix, "waitlist-local/");
  assert.equal(getWaitlistStore({ VERCEL: "1", VERCEL_ENV: "production", BLOB_STORE_ID: "store_x" }, "suspect")?.prefix, "waitlist/suspect/");
});

test("the list key must match and be long enough", () => {
  const key = "k".repeat(32);
  assert.equal(adminKeyMatches(key, key), true);
  assert.equal(adminKeyMatches(` ${key} `, key), true);
  assert.equal(adminKeyMatches("wrong", key), false);
  assert.equal(adminKeyMatches(null, key), false);
  assert.equal(adminKeyMatches(key, undefined), false);
  assert.equal(adminKeyMatches("short", "short"), false);
});

test("sign-in opens off production and on the flag", () => {
  assert.equal(signInOpen({}), true);
  assert.equal(signInOpen({ VERCEL_ENV: "preview" }), true);
  assert.equal(signInOpen({ VERCEL_ENV: "production" }), false);
  assert.equal(signInOpen({ VERCEL_ENV: "production", BUCKET_SIGNIN_OPEN: "1" }), true);
  assert.equal(signInOpen({ BUCKET_SIGNIN_OPEN: "0" }), false);
});
