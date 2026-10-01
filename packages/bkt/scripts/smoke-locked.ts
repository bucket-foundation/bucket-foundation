import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [bin] = process.argv.slice(2);
if (!bin) throw new Error("usage: smoke-locked.ts BKT_BINARY");

const home = mkdtempSync(join(tmpdir(), "bkt-locked-"));
const data = join(home, "data");
const env = { ...process.env, BKT_HOME: data, BKT_UI_DIR: join(home, "no-ui") };
const SERVICE = "org.freedesktop.secrets";
const ROOT = "/org/freedesktop/secrets";

function check(ok: unknown, what: string): void {
  if (!ok) throw new Error(`locked smoke: ${what}`);
  console.log(`ok ${what}`);
}

function sh(argv: string[], vars: Record<string, string | undefined> = process.env) {
  const r = Bun.spawnSync(argv, { env: vars, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 90_000 });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

const hide = (text: string) => text.replace(/^secret = .*$/gm, "secret = [hidden]").trim();
const gdbus = (path: string, method: string, ...args: string[]) => sh(["gdbus", "call", "--session", "--dest", SERVICE, "--object-path", path, "--method", method, ...args]);
const entries = () => (gdbus(ROOT, "org.freedesktop.Secret.Service.SearchItems", "{'service': 'bucket-bkt'}").out.match(/collection\/[^']+/g) ?? []).sort();
const bkt = (args: string[]) => sh([bin, ...args], env);

try {
  const init = bkt(["init"]);
  check(init.code === 0, `bkt init on the unlocked keyring (exit ${init.code}: ${init.err.trim()})`);
  const scope = readFileSync(join(data, "keyring-scope"), "utf8").trim();
  const account = ["service", "bucket-bkt", "account", `db-data-key.${scope}`];
  const before = entries();
  check(before.length === 2, `the keyring holds this folder's two entries (${before.length})`);

  const collection = gdbus(ROOT, "org.freedesktop.Secret.Service.ReadAlias", "default").out.match(/\/org\/freedesktop\/secrets\/collection\/[^']+/)?.[0];
  check(collection, `the default collection is ${collection}`);
  const locked = gdbus(ROOT, "org.freedesktop.Secret.Service.Lock", `['${collection}']`);
  console.log(`lock call: exit ${locked.code} ${locked.out.trim()} ${locked.err.trim()}`);
  const state = gdbus(collection!, "org.freedesktop.DBus.Properties.Get", "org.freedesktop.Secret.Collection", "Locked");
  console.log(`collection Locked property: ${state.out.trim()}`);
  check(state.out.includes("true"), "the collection is locked");

  const lookup = sh(["secret-tool", "lookup", ...account]);
  console.log(`locked lookup: exit ${lookup.code}, stdout ${lookup.out.length} bytes, stderr "${lookup.err.trim()}"`);
  const search = sh(["secret-tool", "search", "--all", ...account]);
  console.log(`locked search: exit ${search.code}\nstdout:\n${hide(search.out)}\nstderr:\n${hide(search.err)}`);
  const relocked = gdbus(collection!, "org.freedesktop.DBus.Properties.Get", "org.freedesktop.Secret.Collection", "Locked");
  console.log(`collection Locked property after the lookups: ${relocked.out.trim()}`);

  const withDb = bkt(["stats"]);
  console.log(`bkt stats with the database present: exit ${withDb.code} ${withDb.err.trim()}`);
  check(withDb.code === 1 && withDb.err.includes("keyring locked"), "bkt refuses with the locked message while bkt.db exists");

  for (const f of readdirSync(data).filter((f) => f.startsWith("bkt.db"))) rmSync(join(data, f));
  const noDb = bkt(["init"]);
  console.log(`bkt init with the database gone: exit ${noDb.code} ${noDb.err.trim()}`);
  check(noDb.code === 1 && noDb.err.includes("keyring locked"), "bkt refuses with the locked message when bkt.db is gone");
  check(!existsSync(join(data, "bkt.db")), "no database was created");
  check(readFileSync(join(data, "keyring-scope"), "utf8").trim() === scope, "the scope file is unchanged");
  check(JSON.stringify(entries()) === JSON.stringify(before), "the keyring holds the same two entries");
  console.log("locked smoke passed");
} finally {
  rmSync(home, { recursive: true, force: true });
}
