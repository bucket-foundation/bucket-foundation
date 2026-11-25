import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEST_DB as DB } from "./lib/test-harness";

const probe = spawnSync("psql", [DB, "-At", "-c", "select 1"], { encoding: "utf8" });
const skip = probe.status === 0 ? false : "no local database";
const migration = (name: string) => readFileSync(join(__dirname, "..", "supabase/migrations", name), "utf8");

function run(sql: string) {
  return spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
}

const ID = "11111111-2222-3333-4444-555555555555";
const ignore = `insert into bucket.lobby_guest_revoked (guest_id) values ('${ID}') on conflict (guest_id) do nothing;`;
const update = `insert into bucket.lobby_guest_revoked (guest_id) values ('${ID}') on conflict (guest_id) do update set revoked_at = excluded.revoked_at;`;

test("revoking twice works for service_role without an update privilege", { skip }, () => {
  const r = run(`begin;
${migration("20261124200000_polingual_lobby_guest_revoked.sql")}
revoke update on bucket.lobby_guest_revoked from service_role;
set local role service_role;
${ignore}
${ignore}
select count(*) from bucket.lobby_guest_revoked where guest_id = '${ID}';
rollback;`);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^1$/m);
});

test("the old upsert fails without update and passes after the grant migration", { skip }, () => {
  const before = run(`begin;
${migration("20261124200000_polingual_lobby_guest_revoked.sql")}
revoke update on bucket.lobby_guest_revoked from service_role;
set local role service_role;
${ignore}
${update}
rollback;`);
  assert.notEqual(before.status, 0);
  assert.match(before.stderr, /permission denied/);
  const after = run(`begin;
${migration("20261124200000_polingual_lobby_guest_revoked.sql")}
revoke update on bucket.lobby_guest_revoked from service_role;
${migration("20261124220000_polingual_lobby_guest_revoked_update.sql")}
set local role service_role;
${ignore}
${update}
rollback;`);
  assert.equal(after.status, 0, after.stderr);
});
