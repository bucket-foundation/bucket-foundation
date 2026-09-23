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
