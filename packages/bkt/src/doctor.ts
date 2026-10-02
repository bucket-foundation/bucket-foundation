import { Database, constants } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { colorEnabled, interactive, KEY_STORES, type Tty } from "./cli/out";
import { LEGACY_ACCOUNTS, scopedAccounts, type KeyAccounts } from "./device";
import { KeyringHeldError, REMEDY, type Keyring } from "./keyring";
import type { Pack } from "./pack/export";
import type { ExplorePack } from "./pack/explore";
import type { Env, ExecSync, Platform } from "./platform";
import { SHORT_FIELDS } from "./short-fields";
import { SCHEMA_VERSION } from "./store";

export type CheckStatus = "ok" | "warn" | "fail";

export interface Check {
  id: string;
  name: string;
  status: CheckStatus;
  result: string;
  fix: string | null;
}

export interface DoctorDeps {
  dir: string;
  env: Env;
  platform: Platform;
  keyringKind?: string;
  keyring: () => Keyring | null;
  pack: Pick<Pack, "version" | "items" | "atoms">;
  explore: ExplorePack;
  uiDir: string;
  runtimeDir: string;
  tty: Tty;
  columns?: number;
  run: ExecSync;
  alive: (pid: number) => boolean;
}

export const ANALYSIS_MODULES = ["numpy", "matplotlib", "pypdf", "pyarrow"];

const ok = (id: string, name: string, result: string): Check => ({ id, name, status: "ok", result, fix: null });
const warn = (id: string, name: string, result: string, fix: string): Check => ({ id, name, status: "warn", result, fix });
const fail = (id: string, name: string, result: string, fix: string): Check => ({ id, name, status: "fail", result, fix });

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface DbFacts {
  version: number;
  pack: string | null;
  scope: string | null;
  explore: string | null;
}

export function readDbFacts(path: string): DbFacts {
  const db = new Database(`${pathToFileURL(path).href}?immutable=1`, constants.SQLITE_OPEN_READONLY | constants.SQLITE_OPEN_URI);
  try {
    const version = db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version;
    const hasMeta = db.query<{ n: number }, []>("select count(*) n from sqlite_master where name = 'meta'").get()!.n > 0;
    const meta = (k: string) => (hasMeta ? (db.query<{ v: string }, [string]>("select v from meta where k = ?").get(k)?.v ?? null) : null);
    return { version, pack: meta("pack_version"), scope: meta("keyring_scope"), explore: meta("explore_pack_version") };
  } finally {
    db.close();
  }
}

function dbState(dir: string): { path: string; facts: DbFacts | null; error: string | null } {
  const path = join(dir, "bkt.db");
  if (!existsSync(path) || statSync(path).size === 0) return { path, facts: null, error: null };
  try {
    return { path, facts: readDbFacts(path), error: null };
  } catch (e) {
    return { path, facts: null, error: message(e) };
  }
}

function dataFolder(d: DoctorDeps): Check {
  const name = "Data folder";
  if (!existsSync(d.dir)) return fail("data-folder", name, `${d.dir} does not exist yet.`, "Run bkt init.");
  const st = statSync(d.dir);
  if (!st.isDirectory()) return fail("data-folder", name, `${d.dir} is a file.`, `Move ${d.dir} aside and run bkt init.`);
  if (d.platform.os !== "win32" && (st.mode & 0o077) !== 0)
    return fail("data-folder", name, `${d.dir} is open to other users on this computer.`, `Run chmod 700 ${d.dir}`);
  return ok("data-folder", name, d.platform.os === "win32" ? `${d.dir} is present.` : `${d.dir} is private to you.`);
}

function accountsFor(dir: string, facts: DbFacts | null): KeyAccounts {
  const file = join(dir, "keyring-scope");
  const fromFile = existsSync(file) ? readFileSync(file, "utf8").trim() : null;
  const scope = facts?.scope ?? fromFile;
  return scope && /^[0-9a-f]{32}$/.test(scope) ? scopedAccounts(scope) : LEGACY_ACCOUNTS;
}

async function keyStore(d: DoctorDeps, db: ReturnType<typeof dbState>): Promise<Check> {
  const name = "Key store";
  const native = d.platform.nativeKeyring;
  const kind = d.keyringKind ?? d.env.BKT_KEYRING ?? native;
  const hasDb = db.facts !== null || db.error !== null;
  if (kind === "passphrase") {
    if (existsSync(join(d.dir, "keyring.json"))) return ok("key-store", name, "The passphrase vault is present. Doctor leaves it closed.");
    if (hasDb) return fail("key-store", name, "Missing: the database exists and the passphrase vault is gone.", REMEDY.passphrase);
    return ok("key-store", name, "No passphrase vault yet.");
  }
  if (kind !== native && kind !== "native") return fail("key-store", name, `${kind} is not a key store bkt knows.`, `Use --keyring ${native} or --keyring passphrase.`);
  const label = KEY_STORES[native] ?? native;
  const kr = d.keyring();
  if (!kr) return fail("key-store", name, `The ${label} is unavailable in this session.`, "Sign in to a desktop session, or run bkt init --keyring passphrase.");
  const accounts = accountsFor(d.dir, db.facts);
  let held: boolean;
  try {
    held = (await kr.get(accounts.data)) !== null && (await kr.get(accounts.device)) !== null;
  } catch (e) {
    if (e instanceof KeyringHeldError) return fail("key-store", name, `Locked: the ${label} holds the keys and would not release them.`, REMEDY[kr.kind]);
    return fail("key-store", name, `The ${label} could not be read: ${message(e)}`, REMEDY[kr.kind]);
  }
  if (held) return ok("key-store", name, `The ${label} holds the keys for this folder.`);
  if (hasDb) return fail("key-store", name, `Locked or missing: the database exists and the ${label} gave no key for it.`, REMEDY[kr.kind]);
  return ok("key-store", name, `The ${label} is ready and holds no keys for this folder yet.`);
}

function database(db: ReturnType<typeof dbState>): Check {
  const name = "Database";
  if (db.error) return fail("database", name, `${db.path} does not open: ${db.error}`, `Restore ${db.path} from a backup, or move it aside and run bkt init.`);
  if (!db.facts) return fail("database", name, "No database yet.", "Run bkt init.");
  const v = db.facts.version;
  if (v > SCHEMA_VERSION) return fail("database", name, `It opens at version ${v}, newer than this bkt reads (${SCHEMA_VERSION}).`, "Run bkt update and install the newer release.");
  if (v < SCHEMA_VERSION) return ok("database", name, `It opens at version ${v}. The next bkt command brings it to version ${SCHEMA_VERSION}.`);
  return ok("database", name, `It opens at version ${v}.`);
}

export function packChecksum(pack: Pick<Pack, "items" | "atoms">): string {
  return createHash("sha256").update(JSON.stringify([pack.items, pack.atoms])).digest("hex").slice(0, 12);
}

function contentPack(d: DoctorDeps, facts: DbFacts | null): Check {
  const name = "Content pack";
  const sum = packChecksum(d.pack);
  if (sum !== d.pack.version) return fail("content-pack", name, `Version ${d.pack.version} has checksum ${sum}; the two should match.`, "Install bkt again: run bkt update.");
  const held = facts?.pack ? (facts.pack === d.pack.version ? " The database holds the same version." : " The next bkt command loads it into the database.") : "";
  const quiz = d.pack.items.filter((i) => SHORT_FIELDS.items[i.id]).length;
  return ok("content-pack", name, `Version ${d.pack.version}, ${d.pack.items.length} items, ${quiz} with short quiz fields, checksum matches.${held}`);
}

export function exploreChecksum(pack: ExplorePack): string {
  const { version: _v, sha256: _s, ...body } = pack;
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function explorePackCheck(d: DoctorDeps, facts: DbFacts | null): Check {
  const name = "Explore pack";
  const sum = exploreChecksum(d.explore);
  if (sum !== d.explore.sha256 || !sum.startsWith(d.explore.version))
    return fail("explore-pack", name, `Version ${d.explore.version} has checksum ${sum.slice(0, 12)}; the two should match.`, "Install bkt again: run bkt update.");
  const held = facts?.explore ? (facts.explore === d.explore.version ? " The database holds the same version." : " The next bkt app loads it into the database.") : "";
  return ok("explore-pack", name, `Version ${d.explore.version}, ${d.explore.sources.length} sources, checksum matches.${held}`);
}

function windowFiles(d: DoctorDeps): Check {
  const name = "Window files";
  if (existsSync(join(d.uiDir, "index.html"))) return ok("window-files", name, `Present in ${d.uiDir}.`);
  return warn("window-files", name, `Missing from ${d.uiDir}. bkt app needs them.`, "Install the Bucket desktop app, or set BKT_UI_DIR to the built views.");
}

function openWindowCheck(d: DoctorDeps): Check {
  const name = "Open window";
  try {
    const rec = JSON.parse(readFileSync(join(d.runtimeDir, "app.json"), "utf8")) as { pid?: unknown; port?: unknown };
    if (typeof rec.pid === "number" && typeof rec.port === "number" && Number.isInteger(rec.pid) && d.alive(rec.pid)) return ok("open-window", name, `A window is open on port ${rec.port}.`);
  } catch {
    return ok("open-window", name, "No window is open.");
  }
  return ok("open-window", name, "No window is open.");
}

const PY_PROBE = "import importlib.util,sys;print(sys.version.split()[0]);print(' '.join(m for m in sys.argv[1:] if importlib.util.find_spec(m) is None))";

function python(d: DoctorDeps): Check {
  const name = "Analysis tools";
  const bin = d.platform.python();
  const r = d.run([bin, "-B", "-c", PY_PROBE, ...ANALYSIS_MODULES]);
  if (r.code !== 0) return warn("python", name, `${bin} did not start. bkt analyze needs Python 3.`, "Install Python 3 from python.org.");
  const [version = "", missing = ""] = r.stdout.split(/\r?\n/).map((l) => l.trim());
  if (missing) return warn("python", name, `${bin} ${version} lacks ${missing.split(" ").join(", ")}.`, `Run ${bin} -m pip install --user ${missing}`);
  return ok("python", name, `${bin} ${version} has ${ANALYSIS_MODULES.join(", ")}.`);
}

function terminal(d: DoctorDeps): Check {
  const real = interactive(d.env, d.tty);
  const width = d.columns ? `${d.columns} columns wide` : "width unknown";
  const colour = colorEnabled(d.env, d.tty) ? "colour on" : "colour off";
  return ok("terminal", "Terminal", `${real ? "A real terminal" : "No terminal here; the terminal app needs one"}, ${width}, ${colour}.`);
}

export async function runDoctor(d: DoctorDeps): Promise<Check[]> {
  const db = dbState(d.dir);
  return [dataFolder(d), await keyStore(d, db), database(db), contentPack(d, db.facts), explorePackCheck(d, db.facts), windowFiles(d), openWindowCheck(d), python(d), terminal(d)];
}

export function doctorPassed(checks: Check[]): boolean {
  return checks.every((c) => c.status !== "fail");
}

export function doctorLines(checks: Check[]): string[] {
  const width = Math.max(...checks.map((c) => c.name.length));
  const lines = checks.map((c) => `${c.status.padEnd(4)}  ${c.name.padEnd(width)}  ${c.result}${c.fix ? ` Fix: ${c.fix}` : ""}`);
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const tail = failed ? `${failed} of ${checks.length} checks failed.` : warned ? `No check failed. ${warned} of ${checks.length} carry a warning.` : "All checks passed.";
  return [...lines, tail];
}
