import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { canonicalUrl, isDuplicate, itemKey, lineProblems, readLedger, report, type ItemLine, type RunLine } from "./research-os/ai-watch/ledger";

const item = (over: Partial<ItemLine> = {}): ItemLine => ({
  kind: "item",
  sourceUrl: "https://huggingface.co/example/encoder",
  revision: "rev-1",
  title: "An example encoder",
  releasedAt: "2026-09-20",
  discoveredAt: "2026-09-21",
  assessedAt: "2026-09-21T13:00:00Z",
  primarySources: ["https://arxiv.org/abs/2609.00001"],
  mechanism: "A distilled bi-encoder trained on scientific citation pairs.",
  evidenceLevel: "preprint",
  closestWork: "SPECTER2",
  component: "encoder",
  rightsCompute: { license: "apache-2.0", weightsAvailable: true, paid: false, compute: "CPU, 90 MB" },
  test: "Beats MiniLM on nDCG@5 over the development queries at equal latency.",
  disposition: "evaluate",
  ...over,
});

const run = (over: Partial<RunLine> = {}): RunLine => ({
  kind: "run",
  runAt: "2026-09-22T13:00:00Z",
  window: { from: "2026-09-15", to: "2026-09-22" },
  sourcesChecked: ["https://huggingface.co/models", "https://arxiv.org/list/cs.IR/new"],
  failures: [],
  candidates: 3,
  deepReads: 1,
  ...over,
});

const jsonl = (...lines: object[]) => lines.map((l) => JSON.stringify(l)).join("\n") + "\n";

test("a URL has one canonical form, and an item key is its source plus revision", () => {
  assert.equal(canonicalUrl("https://Example.org/a/#frag"), "https://example.org/a");
  assert.equal(canonicalUrl("http://example.org/a"), null);
  assert.equal(itemKey(item()), itemKey(item({ sourceUrl: "https://huggingface.co/example/encoder/" })));
  assert.notEqual(itemKey(item()), itemKey(item({ revision: "rev-2" })));
  assert.match(itemKey(item()), /^[0-9a-f]{16}$/);
});

test("an item needs every field the plan names", () => {
  assert.deepEqual(lineProblems(item()), []);
  const cases: [Partial<ItemLine>, RegExp][] = [
    [{ sourceUrl: "http://insecure.example" }, /sourceUrl/],
    [{ primarySources: [] }, /primarySources/],
    [{ mechanism: "new" }, /mechanism/],
    [{ evidenceLevel: "rumour" as ItemLine["evidenceLevel"] }, /evidenceLevel/],
    [{ component: "website" as ItemLine["component"] }, /component/],
    [{ test: "try it" }, /falsifiable/],
    [{ disposition: "maybe" as ItemLine["disposition"] }, /disposition/],
    [{ discoveredAt: "2026-09-19" }, /precedes releasedAt/],
    [{ releasedAt: "last week" }, /releasedAt is a date/],
    [{ rightsCompute: { license: "", weightsAvailable: true, paid: false, compute: "x" } }, /rightsCompute/],
  ];
  for (const [over, why] of cases) assert.match(lineProblems(item(over)).join("\n"), why, JSON.stringify(over));
});

test("paid work cannot be evaluated inside the zero-dollar scope", () => {
  const paid = { license: "commercial", weightsAvailable: false, paid: true, compute: "hosted API" };
  assert.match(lineProblems(item({ rightsCompute: paid })).join(), /propose an amendment with a budget/);
  assert.deepEqual(lineProblems(item({ rightsCompute: paid, disposition: "propose-amendment" })), []);
  assert.deepEqual(lineProblems(item({ rightsCompute: paid, disposition: "prior-art" })), []);
});

test("a run records what it read and stays inside twelve candidates and four deep reads", () => {
  assert.deepEqual(lineProblems(run()), []);
  assert.match(lineProblems(run({ candidates: 13 })).join(), /candidates is 0 to 12/);
  assert.match(lineProblems(run({ deepReads: 5, candidates: 12 })).join(), /deepReads is 0 to 4/);
  assert.match(lineProblems(run({ deepReads: 3, candidates: 2 })).join(), /cannot exceed candidates/);
  assert.match(lineProblems(run({ sourcesChecked: [] })).join(), /sourcesChecked/);
  assert.match(lineProblems(run({ window: { from: "2026-09-22", to: "2026-09-15" } })).join(), /window/);
  assert.match(lineProblems(run({ failures: [{ source: "arxiv", error: "" }] })).join(), /failures/);
  assert.match(lineProblems({ kind: "gossip" }).join(), /unknown line kind/);
});

test("the same assessment twice is a duplicate; a changed one is a new version", () => {
  const ledger = readLedger(jsonl(item()));
  assert.equal(isDuplicate(ledger, item({ assessedAt: "2026-09-22T13:00:00Z", discoveredAt: "2026-09-22" })), true);
  assert.equal(isDuplicate(ledger, item({ disposition: "prior-art" })), false);
  const two = readLedger(jsonl(item(), item({ disposition: "prior-art", assessedAt: "2026-09-22T13:00:00Z" })));
  assert.equal(two.items.size, 1);
  const only = Array.from(two.items.values())[0];
  assert.deepEqual([only.versions, only.current.disposition], [2, "prior-art"]);
});

test("a new revision of an assessed source reopens it under its own key", () => {
  const ledger = readLedger(jsonl(item(), item({ revision: "rev-2", assessedAt: "2026-09-22T13:00:00Z" })));
  assert.equal(ledger.items.size, 2);
  const second = ledger.items.get(itemKey(item({ revision: "rev-2" })))!;
  assert.equal(second.reopens, itemKey(item()));
  assert.equal(ledger.items.get(itemKey(item()))!.reopens, null);
});

test("a milestone takes one proposed amendment, named before it, and nothing else", () => {
  const proposal = item({ disposition: "propose-amendment" });
  const key = itemKey(proposal);
  const sel = (over: object = {}) => ({ kind: "selection", milestone: "pilot-1", itemKey: key, selectedAt: "2026-09-23", selectedBy: "founder", replaces: "minilm-l6-v2", ...over });
  assert.deepEqual(readLedger(jsonl(proposal, sel())).problems, []);
  assert.match(readLedger(jsonl(proposal, sel(), sel())).problems.join(), /already has its one selection/);
  assert.match(readLedger(jsonl(item(), sel({ itemKey: itemKey(item()) }))).problems.join(), /not a proposed amendment/);
  assert.match(readLedger(jsonl(sel(), proposal)).problems.join(), /does not hold before it/);
});

test("the report stays quiet on an ordinary day and speaks on what matters", () => {
  const quiet = report(readLedger(jsonl(run(), item({ disposition: "ignore", assessedAt: "2026-09-22T13:00:00Z" }))), "2026-09-22", "2026-09-22T20:00:00Z");
  assert.deepEqual([quiet.notify, quiet.reasons], [false, []]);
  assert.equal(quiet.byDisposition.ignore, 1);

  const failed = report(readLedger(jsonl(run({ failures: [{ source: "arxiv listing", error: "HTTP 503" }] }))), "2026-09-22", "2026-09-22T20:00:00Z");
  assert.equal(failed.notify, true);
  assert.match(failed.reasons.join(), /arxiv listing failed: HTTP 503/);

  const none = report(readLedger(""), "2026-09-22", "2026-09-22T20:00:00Z");
  assert.match(none.reasons.join(), /no watch run recorded/);

  const stale = report(readLedger(jsonl(run({ runAt: "2026-09-20T13:00:00Z" }))), "2026-09-19", "2026-09-22T20:00:00Z");
  assert.match(stale.reasons.join(), /more than 36 hours ago/);

  const found = report(readLedger(jsonl(run(), item({ assessedAt: "2026-09-22T13:00:00Z" }), item({ revision: "r9", disposition: "propose-amendment", assessedAt: "2026-09-22T13:00:00Z" }))), "2026-09-22", "2026-09-22T20:00:00Z");
  assert.match(found.reasons.join(" | "), /1 to evaluate within current scope \| 1 proposed amendments/);
  assert.equal(found.openProposals.length, 1);

  const broken = report(readLedger(jsonl(run()) + "{not json}\n"), "2026-09-22", "2026-09-22T20:00:00Z");
  assert.match(broken.reasons.join(), /1 ledger lines break the contract/);
});

test("the command line appends through the contract and dedupes", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-watch-"));
  const ledger = path.join(dir, "ledger.jsonl");
  const cli = (args: string[], input?: string) =>
    spawnSync("npx", ["ts-node", "--compiler-options", '{"module":"commonjs"}', path.join(__dirname, "research-os", "ai-watch", "cli.ts"), ...args, "--ledger", ledger], {
      input,
      encoding: "utf8",
    });
  try {
    assert.equal(cli(["add"], JSON.stringify(item())).status, 0);
    const again = cli(["add"], JSON.stringify(item({ assessedAt: "2026-09-22T09:00:00Z" })));
    assert.match(again.stdout, /already assessed this way/);
    assert.equal(cli(["add"], JSON.stringify(item({ test: "no" }))).status, 1);
    assert.equal(cli(["add"], JSON.stringify(run())).status, 0);
    assert.equal(readFileSync(ledger, "utf8").trim().split("\n").length, 2);
    const refused = cli(["select", "--milestone", "m1", "--item", itemKey(item()), "--replaces", "minilm", "--by", "founder"]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /a milestone selects a proposed amendment/);
    assert.equal(cli(["check"]).status, 0);
    const r = cli(["report", "--since", "2026-09-21", "--now", "2026-09-22T20:00:00Z"]);
    assert.match(r.stdout, /^NOTIFY/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
