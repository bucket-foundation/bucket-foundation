import fs from "node:fs";
import path from "node:path";
import { normalizeState, type EngineState } from "../src/lib/academy/engine";
import { backupBranch, emptyMemory, foldByLang, langBranch, memoryState, mergeMemory, normalizeMemory, rollback, sharedMemoryOn, type LangMemory, type LangRow } from "../src/lib/academy/lang-memory";
import { gradeShared, openShared, placeShared, type MemoryIO, type SharedSession } from "../src/lib/academy/lang-memory-store";
import { buildLangCorpus, buildQueue, cardId, createSystem, gradeCard, newToday, NEW_PER_LANG_PER_DAY, planSession, progressBranch, type LangCard, type LangSystem } from "../src/lib/academy/lang-systems";
import type { ServerBranches } from "../src/lib/academy/progress-store";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const ROOT = path.join(__dirname, "..");
const CORPUS = path.join(ROOT, "learning", "app", "corpus");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(CORPUS, f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 12);

class FakeIO implements MemoryIO {
  local = new Map<string, unknown>();
  server = new Map<string, unknown>();
  outbox: LangRow[] = [];
  pushes: string[] = [];
  failPush = new Set<string>();
  clock = T0;
  appended: { branch: string; card_id: string; review_id: string }[] = [];
  appendReview(branch: string, r: { card_id: string; review_id: string }) {
    this.appended.push({ branch, card_id: r.card_id, review_id: r.review_id });
  }
  n = 0;
  constructor(public device = "dev-a") {}
  async pull(): Promise<ServerBranches> {
    return Object.fromEntries(Array.from(this.server.entries()).map(([k, v]) => [k, { data: JSON.parse(JSON.stringify(v)), updated_at: "" }]));
  }
  readRaw(b: string) {
    const v = this.local.get(b);
    return v === undefined ? null : JSON.parse(JSON.stringify(v));
  }
  writeRaw(b: string, d: unknown) {
    this.local.set(b, JSON.parse(JSON.stringify(d)));
  }
  async push(b: string, d: unknown) {
    this.pushes.push(b);
    if (this.failPush.has(b)) return false;
    this.server.set(b, JSON.parse(JSON.stringify(d)));
    return true;
  }
  readOutbox() {
    return [...this.outbox];
  }
  writeOutbox(rows: LangRow[]) {
    this.outbox = [...rows];
  }
  uuid() {
    return `${this.device}-r${++this.n}`;
  }
  deviceId() {
    return this.device;
  }
  tz() {
    return "UTC";
  }
  now() {
    return this.clock;
  }
}

function studied(lang: string, items: string[], start: number): EngineState {
  return items.reduce((s, id, i) => gradeCard(s, lang, id, 3, start + i * 1000, "UTC"), normalizeState(null));
}

async function main() {
  ok(!sharedMemoryOn(undefined) && !sharedMemoryOn("0") && sharedMemoryOn("1"), "POLINGUAL_SHARED_MEMORY is off unless set to 1");

  const romance = createSystem("en", ["fr", "es", "it"], [], T0);
  const trio = createSystem("en", ["it", "pl"], [romance], T0 + 1);
  romance.placement = { it: 4 };
  const systems = [romance, trio];

  const words = corpus.items.filter((i) => i.kind === "word" && i.forms.it && i.forms.pl && i.forms.fr).slice(0, 8).map((i) => i.id);
  const a = studied("it", words.slice(0, 3), T0 - 2 * DAY);
  const b = gradeCard(studied("it", words.slice(1, 4), T0 - DAY), "pl", words[0], 3, T0 - DAY, "UTC");
  (a.cards[cardId("it", words[2])] as LangCard).placed = true;

  const io = new FakeIO();
  io.server.set(progressBranch(romance), a);
  io.server.set(progressBranch(trio), b);
  const before = JSON.stringify([io.server.get(progressBranch(romance)), io.server.get(progressBranch(trio))]);

  const s1 = await openShared(io, trio, systems);
  const it = normalizeMemory("it", io.server.get(langBranch("it")));
  ok(it.migrated === "v1", "lang-it carries the migrated:v1 marker");
  ok(!!io.server.get(backupBranch(progressBranch(romance))) && !!io.server.get(backupBranch(progressBranch(trio))), "both old branches have a .bak-v1 copy");
  ok(io.pushes.indexOf(backupBranch(progressBranch(romance))) < io.pushes.indexOf(langBranch("it")), "the backup reaches the server before lang-it");
  ok(JSON.stringify([io.server.get(progressBranch(romance)), io.server.get(progressBranch(trio))]) === before, "old lang-sys branches stay untouched");
  const w1 = it.baseline.cards[cardId("it", words[1])] as LangCard;
  ok(w1.lastReview === b.cards[cardId("it", words[1])].lastReview && w1.introduced === (a.cards[cardId("it", words[1])] as LangCard).introduced, "evidence union: newest review wins, earliest introduction kept");
  ok(!(it.baseline.cards[cardId("it", words[2])] as LangCard).placed, "a card placed in one system and studied in another is not marked placed");
  ok(Object.keys(it.baseline.cards).every((id) => id.startsWith("it:")), "lang-it holds only Italian cards");
  ok(s1.langStatus.it === "ready" && s1.langStatus.pl === "ready", "both languages load");

  const pushesBefore = io.pushes.length;
  const again = await openShared(io, trio, systems);
  ok(JSON.stringify(normalizeMemory("it", io.server.get(langBranch("it")))) === JSON.stringify(it) && io.pushes.length === pushesBefore, "a second open is idempotent and writes nothing");
  ok(JSON.stringify(again.view) === JSON.stringify(s1.view), "the folded view is stable across opens");

  const plan = planSession(s1.plan, corpus, s1.view, T0);
  ok(!plan.some((c) => c.lang === "it" && words.slice(0, 4).includes(c.itemId) && !s1.view.cards[cardId("it", c.itemId)]), "Italian words studied in Romance are not introduced again in the trio");
  ok(s1.plan.placement.it === 4, "max placement: the trio plans Italian from tier 4 placed in Romance");

  let s: SharedSession = s1;
  const fresh = corpus.items.filter((i) => i.kind === "word" && i.forms.it && !s.view.cards[cardId("it", i.id)]).slice(0, NEW_PER_LANG_PER_DAY).map((i) => i.id);
  for (const id of fresh) {
    const g0 = gradeShared(io, s, "it", id, 3);
    s = g0.session;
    await g0.saved;
  }
  ok(io.appended.length === fresh.length && io.appended.every((x) => x.branch === langBranch("it") && x.card_id.startsWith("it:")), "each shared-memory grade is appended to the review log on its lang-<code> branch");
  {
    const one = new FakeIO("dev-one");
    one.server.set(progressBranch(trio), b);
    const s0 = await openShared(one, trio, systems);
    const fresh1 = corpus.items.find((i) => i.kind === "word" && i.forms.pl && !s0.view.cards[cardId("pl", i.id)])!.id;
    const g = gradeShared(one, s0, "pl", fresh1, 3);
    await g.saved;
    const memRows = normalizeMemory("pl", one.server.get(langBranch("pl"))).log.filter((r) => r.card_id === cardId("pl", fresh1));
    const logRows = one.appended.filter((r) => r.card_id === cardId("pl", fresh1));
    ok(memRows.length === 1 && logRows.length === 1 && memRows[0].review_id === logRows[0].review_id, "one grade gives one log row and one memory row with the same review_id");
    const twice = mergeMemory(normalizeMemory("pl", one.server.get(langBranch("pl"))), { ...emptyMemory("pl"), log: [{ ...memRows[0], device_id: "log" }] });
    ok(memoryState(twice).cards[cardId("pl", fresh1)].reps === 1, "replaying the memory and log copies of that grade gives reps 1");
  }
  const romanceView = (await openShared(io, romance, systems)).view;
  ok(newToday(romanceView, "it", T0) >= NEW_PER_LANG_PER_DAY, "the per-language daily new budget is shared across systems");
  const romancePlan = planSession((await openShared(io, romance, systems)).plan, corpus, romanceView, T0);
  ok(!romancePlan.some((c) => c.lang === "it" && !romanceView.cards[cardId("it", c.itemId)]) && romancePlan.some((c) => c.lang === "fr"), "Romance gets no new Italian today and still gets new French");

  const lowered = placeShared(io, s, corpus, "it", 0);
  ok(lowered.system.placement.it === 4 && lowered.session.plan.placement.it === 4, "placement never lowers");

  const mem = normalizeMemory("it", io.server.get(langBranch("it")));
  const dupe = mergeMemory(mem, { ...mem, log: mem.log.map((r) => ({ ...r, device_id: "dev-b" })) });
  const id0 = cardId("it", fresh[0]);
  ok(dupe.log.length === mem.log.length && memoryState(dupe).cards[id0].reps === mem.log.filter((r) => r.card_id === id0).length, "N1: reps equal the rows left after review_id dedupe");

  const baseCard = mem.baseline.cards[cardId("it", words[1])];
  const g1 = gradeShared(io, s, "it", words[1], 3);
  await g1.saved;
  const extra = g1.session;
  ok(memoryState(extra.memories.it).cards[cardId("it", words[1])].reps === (baseCard.reps ?? 0) + 1, "N2: logged rows replay over the unlogged baseline");

  const io2 = new FakeIO("dev-b");
  io.server.forEach((v, k) => io2.server.set(k, v));
  const t2 = await openShared(io2, trio, systems);
  ok(JSON.stringify(t2.memories.it.log) === JSON.stringify(normalizeMemory("it", io.server.get(langBranch("it"))).log), "a second device reads the same Italian log");

  const backups: Record<string, EngineState | null> = {};
  for (const sys of systems) backups[backupBranch(progressBranch(sys))] = normalizeState(io.server.get(backupBranch(progressBranch(sys))));
  const live = normalizeMemory("it", io.server.get(langBranch("it")));
  const orphan: LangMemory = { ...live, log: [...live.log, { ...live.log[0], review_id: "gone-1", system_id: "deleted" }] };
  const rb = rollback(systems, { it: orphan }, backups);
  const trioRows = live.log.filter((r) => r.system_id === trio.id);
  ok(trioRows.every((r) => rb.branches[progressBranch(trio)].cards[r.card_id]) && !Object.keys(rb.branches[progressBranch(romance)].cards).some((id) => trioRows.some((r) => r.card_id === id) && !a.cards[id]), "N3: rollback restores .bak-v1 and re-splits rows by the system that wrote them");
  ok(rb.dropped === 1, "N3: rows from a deleted system are counted as dropped");

  const io3 = new FakeIO("dev-c");
  io3.server.set(progressBranch(romance), a);
  io3.server.set(progressBranch(trio), b);
  io3.failPush.add(backupBranch(progressBranch(romance)));
  const broken = await openShared(io3, trio, systems);
  ok(broken.langStatus.it === "error" && broken.langStatus.pl === "ready", "allSettled: a failed language does not block the other");
  ok(!io3.server.get(langBranch("it")), "no migration marker is written before its backup lands");
  const g = gradeShared(io3, broken, "it", words[5], 3);
  const queued = io3.outbox.find((r) => r.card_id === cardId("it", words[5]));
  ok(!!queued && g.session === broken, "N4: a grade for a failed language waits in the persistent outbox");
  io3.failPush.clear();
  const healed = await openShared(io3, trio, systems);
  const landed = healed.memories.it.log.find((r) => r.review_id === queued!.review_id);
  ok(!!landed && !io3.outbox.some((r) => r.review_id === queued!.review_id), "N4: the outbox row lands with its stable review_id and leaves the outbox");

  ok(!!io3.server.get(backupBranch(progressBranch(romance))) && healed.memories.it.migrated === "v1", "a backup push that failed once is retried before the marker is written");

  const ioA = new FakeIO("dev-a");
  const ioB = new FakeIO("dev-b");
  ioB.server = ioA.server;
  ioA.server.set(progressBranch(trio), b);
  const sa = await openShared(ioA, trio, systems);
  const sb = await openShared(ioB, trio, systems);
  await gradeShared(ioA, sa, "it", words[6], 3).saved;
  await gradeShared(ioB, sb, "it", words[7], 3).saved;
  const both = normalizeMemory("it", ioA.server.get(langBranch("it"))).log.map((r) => r.card_id);
  ok(both.includes(cardId("it", words[6])) && both.includes(cardId("it", words[7])), "a stale device merges the server copy before it pushes, so no rows are lost");

  const newer = gradeCard(normalizeState(io.server.get(progressBranch(romance))), "it", words[2], 4, T0 + 5 * DAY, "UTC");
  const view = foldByLang(trio, { it: live }, systems, { [progressBranch(romance)]: newer, [progressBranch(trio)]: b });
  ok(view.cards[cardId("it", words[2])].lastReview === T0 + 5 * DAY, "dual-read: a review an old client wrote to lang-sys-* shows in the folded view");

  const golden = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/polingual-flag-off-queue.golden.json"), "utf8"));
  const legacyQueue = buildQueue(trio, corpus, b, T0);
  ok(JSON.stringify(legacyQueue) === JSON.stringify(golden.queue) && progressBranch(trio) === golden.branch, "flag off: the legacy queue and branch match the polingual-ux-v1 golden");

  if (failures) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nlang memory: all passed");
}

void main();
