import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(__dirname, "..", "supabase", "migrations");
const USER_COLUMNS = ["user_id", "speaker_id", "reporter_id", "target_user_id", "blocker_id", "host_id"];
const KEPT = new Set(["lobby_guest_revoked"]);

function migrations(): { name: string; sql: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(DIR, name), "utf8") }));
}

function userTables(all: { sql: string }[]): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const { sql } of all) {
    for (const m of Array.from(sql.matchAll(/create table if not exists bucket\.((?:lobby|league)\w*|lobbies)\s*\(([\s\S]*?)\n\);/g))) {
      const cols = USER_COLUMNS.filter((c) => new RegExp(`^\\s*${c}\\s+uuid`, "m").test(m[2]));
      if (cols.length) found.set(m[1], cols);
    }
  }
  return found;
}

function lastErase(all: { name: string; sql: string }[]): { name: string; body: string } {
  const hits = all.filter((m) => /create or replace function bucket\.delete_lobby_user/.test(m.sql));
  const last = hits[hits.length - 1];
  const body = last.sql.slice(last.sql.lastIndexOf("create or replace function bucket.delete_lobby_user"));
  return { name: last.name, body };
}

test("the last delete_lobby_user erases every lobby and league table that holds a user", () => {
  const all = migrations();
  const tables = userTables(all);
  const erase = lastErase(all);
  assert.equal(erase.name, "20261127400000_polingual_delete_lobby_user_final.sql");
  assert.ok(tables.size >= 12, `found ${tables.size} user tables`);
  const missing: string[] = [];
  for (const [table, cols] of Array.from(tables)) {
    if (KEPT.has(table)) continue;
    for (const col of cols) {
      const direct = new RegExp(`delete from bucket\\.${table}\\b[^;]*\\b${col} = p_user`).test(erase.body);
      if (!direct) missing.push(`${table}.${col}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("delete_lobby_user stays closed to public roles", () => {
  const erase = lastErase(migrations());
  assert.match(erase.body, /revoke execute on function bucket\.delete_lobby_user\(uuid\) from public, anon, authenticated;/);
});
