/**
 * Two migrations cannot share a version.
 *
 * Supabase takes the version from the digits that lead the filename and
 * stores it as the primary key of
 * supabase_migrations.schema_migrations, so two files with the same
 * prefix insert the same key twice and the second one fails. A stack
 * that got its migrations by hand through psql never sees this; a fresh
 * `supabase db reset` and the CI database job do.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-migration-versions.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(__dirname, "..", "supabase", "migrations");

test("every migration carries its own version", () => {
  const byVersion = new Map<string, string[]>();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".sql")) continue;
    const version = name.split("_")[0];
    assert.match(version, /^\d{14}$/, `${name} does not start with a 14-digit version`);
    byVersion.set(version, (byVersion.get(version) ?? []).concat(name));
  }
  const clashes = Array.from(byVersion.entries())
    .filter(([, names]) => names.length > 1)
    .map(([version, names]) => `${version}: ${names.join(", ")}`);
  assert.deepEqual(
    clashes,
    [],
    `these migrations share a version, so the second one to apply fails on the schema_migrations primary key: ${clashes.join(" | ")}`,
  );
});
