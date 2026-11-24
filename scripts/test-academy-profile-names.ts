import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeHandle, profileNamesAllowed, unchangedHandle } from "../src/lib/academy/profile";
import { nameAllowed } from "../src/lib/academy/groups-names";

test("usernames refuse reserved words in any case", () => {
  for (const h of ["Polingual", "support", "STAFF", "moderator", "admin", "official"]) assert.equal(normalizeHandle(h), null, h);
  assert.equal(normalizeHandle(" Ana_Lang "), "ana_lang");
});

test("usernames and display names refuse profanity, including split by dashes", () => {
  assert.equal(profileNamesAllowed("ana-lang", "Ana", nameAllowed), true);
  assert.equal(profileNamesAllowed("fuck-you", null, nameAllowed), false);
  assert.equal(profileNamesAllowed("shit_head", null, nameAllowed), false);
  assert.equal(profileNamesAllowed(null, "fuck you", nameAllowed), false);
  assert.equal(profileNamesAllowed(null, null, nameAllowed), true);
});

test("the profile route checks names before writing and handles are unique without case", () => {
  const route = readFileSync(join(__dirname, "..", "src/app/api/academy/profile/route.ts"), "utf8");
  const check = route.indexOf('json({ error: "name_not_allowed" }, 422)');
  assert.ok(check > 0);
  assert.ok(check < route.indexOf(".upsert(row"));
  const sql = readFileSync(join(__dirname, "..", "supabase/migrations/20260925020000_academy_profiles.sql"), "utf8");
  assert.match(sql, /create unique index if not exists academy_profiles_handle_uidx on bucket\.academy_profiles \(lower\(handle\)\)/);
});

test("the polingual client reserves the same words as the server", () => {
  const client = readFileSync(join(__dirname, "..", "polingual/src/lib/app/profile.ts"), "utf8");
  const list = client.match(/const RESERVED = new Set\(\[([^\]]+)\]\)/)?.[1] ?? "";
  for (const w of list.match(/"([^"]+)"/g)!.map((x) => x.slice(1, -1))) assert.equal(normalizeHandle(w), null, w);
  assert.match(client, /name_not_allowed:/);
});

test("the name filter catches lookalike letters, hidden characters and split words", () => {
  const bypasses = ["fuсk", "ѕhit", "bitсh", "fυck", "sh​it", "s.h.i.t", "c u n t", "bi_tch", "s-h-i-t", "ＦＵＣＫ", "sh­it", "Сunt"];
  for (const b of bypasses) assert.equal(nameAllowed(b), false, JSON.stringify(b));
  assert.equal(profileNamesAllowed("bi_tch", null, nameAllowed), false);
  assert.equal(profileNamesAllowed("s-h-i-t", null, nameAllowed), false);
});

test("ordinary names stay allowed", () => {
  for (const ok of ["Ana L", "Ana Lopez", "Therapist", "Scunthorpe", "Grape Juice", "Анна", "Σοφία", "Mia K.", "Jo Ann", "Pakistan fan", "Nikolai"]) assert.equal(nameAllowed(ok), true, ok);
});

test("saving an unchanged handle or display name skips the checks", () => {
  assert.equal(unchangedHandle("Support", "support"), true);
  assert.equal(unchangedHandle(" support ", "support"), true);
  assert.equal(unchangedHandle("support2", "support"), false);
  assert.equal(unchangedHandle("support", null), false);
  const route = readFileSync(join(__dirname, "..", "src/app/api/academy/profile/route.ts"), "utf8");
  assert.match(route, /if \(b\.handle !== undefined && !sameHandle\) \{\n    const h = normalizeHandle\(b\.handle\);/);
  assert.match(route, /const checkHandle = b\.handle !== undefined && !sameHandle \? nextHandle : null;/);
  assert.match(route, /nextDisplay !== \(current\?\.display_name \?\? null\) \? nextDisplay : null/);
});
