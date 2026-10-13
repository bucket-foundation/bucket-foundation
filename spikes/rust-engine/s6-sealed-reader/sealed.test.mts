import { expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseAdvisorReview } from "../../../src/lib/research-os/advisor-review";
import { parseProductionsSnapshot } from "../../../src/lib/research-os/productions-snapshot";
import { open } from "../../../packages/bkt/src/crypto";
import { DailyQuizStore, fermi } from "../../../packages/bkt/src/daily-quiz";
import { DATA_KEY_ACCOUNT, ensureDataKey, ensureDevice } from "../../../packages/bkt/src/device";
import { HaiStore } from "../../../packages/bkt/src/hai/store";
import { HistoryStore } from "../../../packages/bkt/src/history";
import { PassphraseKeyring } from "../../../packages/bkt/src/keyring";
import { NotesStore } from "../../../packages/bkt/src/notes";
import { PeopleStore } from "../../../packages/bkt/src/people";
import { SCHEMA_VERSION, Store } from "../../../packages/bkt/src/store";
import { WorkQuizStore } from "../../../packages/bkt/src/work-quiz";

const exe = process.platform === "win32" ? ".exe" : "";
const reader = resolve(process.env.SEALED_READER ?? join(import.meta.dir, "..", "target", "release", `s6-sealed-reader${exe}`));
const dir = resolve(process.env.SEALED_DIR ?? join(import.meta.dir, "..", ".data", "s6"));
const PASSPHRASE = "spïke ① passphrase";

const person = (rank: number, name: string) => ({ rank, name, score: 1 - rank / 100, percentile: 100 - rank, institution: "North Institute", field: "Biophysics", h_index: 30 - rank, shared_topics: ["water", "light"], star_prime: [0.1, 0.9, 0.5], theta: 1.2, radius: 0.3 });

test("a Rust reader opens every sealed column of a database written by the TypeScript store", async () => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, "bkt.db");
  const vaultPath = join(dir, "keyring.json");

  const keyring = new PassphraseKeyring(vaultPath, PASSPHRASE);
  await ensureDevice(keyring);
  const key = await ensureDataKey(keyring);
  const store = new Store(dbPath, key);
  store.importPack("spike", [1, 2, 3].map((n) => ({ id: `phys/a${n}/0`, atomId: `a${n}`, branch: "phys", title: `t${n}`, level: "recall", prompt: `p${n}`, answer: `ans${n}` })));
  const responses = ["plain answer", "réponse ☃ \u{1f4a1}", "", "x".repeat(5000), null];
  responses.forEach((response, i) => store.recordAttempt({ itemId: `phys/a${(i % 3) + 1}/0`, mode: i % 2 ? "quiz" : "review", response, correct: i % 2 === 0, rating: 3, elapsedMs: 1200 + i, at: 1000 + i }));
  const notes = new NotesStore(store, key);
  notes.save({ title: "first", body: "a note body", pinned: false }, 10);
  notes.save({ title: "Σημείωση", body: "水と光\n\nline two", pinned: true }, 11);
  const hai = new HaiStore(store, key);
  hai.consent(1);
  const probe = hai.startProbe("bank-1", "seed", 2);
  hai.record({ probeId: probe, pairId: "p1", itemId: "i1", condition: "solo", phase: "t0", choice: 2, correct: true, acceptedAi: null, elapsedMs: 900, at: 3 });
  hai.record({ probeId: probe, pairId: "p1", itemId: "i2", condition: "pair", phase: "t0", choice: 0, correct: false, acceptedAi: true, elapsedMs: 950, at: 4 });
  hai.record({ probeId: probe, pairId: "p2", itemId: "i3", condition: "solo", phase: "t0", choice: null, correct: false, acceptedAi: null, elapsedMs: 100, at: 5 });
  new HistoryStore(store, key).save(
    parseProductionsSnapshot({
      productions: [{ id: "p1", kind: "production", status: "accepted", claim: "Structured water forms near hydrophilic walls", target_node_id: "n1", related_node_id: null, node_id: "n9", notes: [{ at: "2026-09-01", decision: "accept" }], updated_at: "2026-09-02T00:00:00Z" }],
      nodes: { n1: { slug: "water", title: "Water", kind: "concept" }, n9: { slug: "ez", title: "Exclusion zone", kind: "claim" } },
    }),
    20,
  );
  const daily = new DailyQuizStore(store, key);
  for (const day of ["2026-09-30", "2026-10-01"])
    daily.put({ day, questions: [fermi({ id: "f1", prompt: "How many lines did the transcript hold?", answer: 1000, explain: "About a thousand." }), { id: "c1", type: "recall", prompt: "Which branch takes desktop PRs?", choices: ["dev", "main"], answer: "dev", limitSec: 30, explain: "Desktop work targets dev." }] }, 30);
  const people = new PeopleStore(store, key);
  people.importReview(parseAdvisorReview({ schema: "bucket.advisor-review/1", rows: [person(1, "Avery Stone"), person(2, "Rowan Hale"), person(3, "Kai Mercer")], context: { key: "abc123", prime_axes: ["water membrane", "light cell", "field"], star_query_prime: [0.5, 0.6, 0.7], summary: "3 of 3 ranked" } }), 40);
  const work = new WorkQuizStore(store, key);
  work.setBeads([{ id: "bkt-1", title: "A bead", status: "open", priority: 1, createdAt: "2026-10-01" }], 50);
  work.setRepo("/srv/example/repo", 51);
  expect(store.journalMode()).toBe("wal");
  store.close();

  const run = Bun.spawnSync([reader, dbPath, vaultPath, PASSPHRASE]);
  expect(run.stderr.toString()).toBe("");
  expect(run.exitCode).toBe(0);
  const out = JSON.parse(run.stdout.toString()) as {
    user_version: number;
    vault: { check: string; data_key_bytes: number; device_key_is_pem: boolean; wrong_passphrase_rejected: boolean };
    sealed_columns: Record<string, number>;
    opened: number;
    failures: unknown[];
    wrong_key_rejected: number;
    wrong_aad_rejected: number;
    cells: { cell: string; aad: string; sealed: string; plaintext: string }[];
  };
  const { cells, ...summary } = out;
  writeFileSync(join(dir, "result.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));

  expect(out.user_version).toBe(SCHEMA_VERSION);
  expect(out.vault).toEqual({ check: "bkt", data_key_bytes: 32, device_key_is_pem: true, wrong_passphrase_rejected: true });
  expect(await keyring.get(DATA_KEY_ACCOUNT)).toBe(key.toString("hex"));
  expect(out.failures).toEqual([]);
  expect(out.sealed_columns).toEqual({
    "advisor_review.meta": 1,
    "advisor_rows.data": 3,
    "attempts.response_enc": 4,
    "daily_quiz.body": 2,
    "hai_answer.response_enc": 2,
    "history_snapshot.doc": 1,
    "meta.v": 1,
    "notes.doc": 2,
    "outbox.payload_enc": 5,
    "work_quiz_source.beads": 1,
    "work_quiz_source.repo": 1,
  });
  expect(out.opened).toBe(23);
  expect(out.wrong_key_rejected).toBe(23);
  expect(out.wrong_aad_rejected).toBe(23);
  for (const c of cells) expect(c.plaintext).toBe(open(key, c.sealed, c.aad));
  const plain = cells.filter((c) => c.cell === "attempts.response_enc").map((c) => c.plaintext).sort();
  expect(plain).toEqual(responses.filter((r): r is string => r !== null).sort());
  expect(cells.find((c) => c.cell === "work_quiz_source.repo")!.plaintext).toBe("/srv/example/repo");
  expect(cells.some((c) => c.cell === "notes.doc" && c.plaintext === JSON.stringify({ title: "Σημείωση", body: "水と光\n\nline two" }))).toBe(true);
}, 120000);
