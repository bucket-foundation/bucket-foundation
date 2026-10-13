import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { applyDecision, parseDecisions, REVIEW_SCHEMA as DECISION_SCHEMA, verifiedTable, type Decision } from "../../bkt-ui/src/alignment";
import { ALIGNMENT_HITS, ALIGNMENT_IDS, alignmentRoutes, searchRows } from "./alignment";
import { alignmentReview, decksOf, deckRules, EMPTY_REVIEW, labelAllowed, REVIEW_FLAG, REVIEW_SCHEMA, reviewRow, splitTopic, type AlignmentReviewPack, type ReviewRow } from "./pack/alignment-review";
import { encodeBlob, RESEARCH_SCHEMA, sha256, type PackedFile, type ReportRecord, type ResearchIndex } from "./pack/research";
import { Research } from "./research";
import { ResearchWork } from "./research-work";
import { startServe, type Serve } from "./serve";
import { REVIEW_SLUG, workspaceItems, type WorkspaceSources } from "./workspace";

const REPO = resolve(import.meta.dir, "../../..");
const scratch: string[] = [];
function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bkt-align-${name}-`));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const row = (over: Partial<ReviewRow>): ReviewRow => ({ id: "r1", table: "courses", code: "MATH 101", label: "Calculus I", level: "undergraduate-lower", where: "Example University", url: "https://example.org/math", cip: "27.01", decks: ["01-mathematics"], ...over });
const PACK: AlignmentReviewPack = {
  schema: REVIEW_SCHEMA,
  staff: true,
  rows: [
    row({}),
    row({ id: "r2", code: "MATH 202", label: "Linear Algebra and Calculus of Several Variables" }),
    row({ id: "r3", table: "progression", code: "7.G.A.1", label: null, where: "a-restricted-system" }),
    row({ id: "r4", code: "PHYS 110", label: "Mechanics", cip: "40.08", decks: ["02-physics"] }),
  ],
};

describe("review pack", () => {
  test("a build without the staff flag packs nothing, and the content file a public build ships is empty", async () => {
    expect(await alignmentReview(REPO, {})).toEqual(EMPTY_REVIEW);
    expect(await alignmentReview(REPO, { [REVIEW_FLAG]: "0" })).toEqual(EMPTY_REVIEW);
    expect(await alignmentReview(temp("no-repo"), { [REVIEW_FLAG]: "1" })).toEqual(EMPTY_REVIEW);
    expect(EMPTY_REVIEW).toEqual({ schema: REVIEW_SCHEMA, staff: false, rows: [] });
    if (process.env[REVIEW_FLAG] === "1") return;
    expect(JSON.parse(readFileSync(resolve(import.meta.dir, "../content/alignment-review.json"), "utf8"))).toEqual(EMPTY_REVIEW);
    const index = JSON.parse(readFileSync(resolve(import.meta.dir, "../content/research-index.json"), "utf8")) as ResearchIndex;
    expect(index.outputs.map((o) => o.slug)).not.toContain(REVIEW_SLUG);
    expect(JSON.stringify(index)).not.toContain("unreviewed-proposal");
  });

  test("a restricted school row keeps its code and link and loses its label; an open one keeps its label", () => {
    const restricted = { id: "k12-x-1", slice: "k12-full", system: "some-closed-system", topic: "7.G.A.1: scale drawings", subfield: "Geometry", level: "lower-secondary", source_url: "https://example.org/standards", cip: { code: "27.01" } };
    expect(labelAllowed("progression", restricted)).toBe(false);
    expect(reviewRow("progression", restricted, ["01-mathematics"])).toEqual({ id: "k12-x-1", table: "progression", code: "7.G.A.1", label: null, level: "lower-secondary", where: "some-closed-system", url: "https://example.org/standards", cip: "27.01", decks: ["01-mathematics"] });
    const open = { ...restricted, id: "k12-y-1", system: "england-nc" };
    expect(labelAllowed("progression", open)).toBe(true);
    expect(reviewRow("progression", open, []).label).toBe("Geometry");
    const course = { id: "cat-x-1", slice: "catalogues", institution: "Example University", code: "MATH 101", title: "Calculus I", level: "undergraduate-lower", source_url: "https://example.org/catalog", cip: { code: "27.0101" } };
    expect(reviewRow("courses", course, ["01-mathematics"])).toEqual({ id: "cat-x-1", table: "courses", code: "MATH 101", label: "Calculus I", level: "undergraduate-lower", where: "Example University", url: "https://example.org/catalog", cip: "27.0101", decks: ["01-mathematics"] });
    const syllabus = { id: "uni-x-1", slice: "university-stem", topic: "Groups, rings and fields", level: "undergraduate-lower", source_url: "https://example.org/syllabus", framework_id: "an-example-syllabus", cip: { code: "27.01" } };
    expect([labelAllowed("progression", syllabus), reviewRow("progression", syllabus, []).label]).toEqual([true, "Groups, rings and fields"]);
    expect(splitTopic("3.MD.C.7d: area of joined rectangles")).toEqual({ code: "3.MD.C.7d", label: "area of joined rectangles" });
    expect(splitTopic("Counting and Cardinality, Kindergarten")).toEqual({ code: null, label: "Counting and Cardinality, Kindergarten" });
    expect(splitTopic("Note: a label with a colon")).toEqual({ code: null, label: "Note: a label with a colon" });
  });

  test("a row joins the decks whose field or code prefix it sits in", () => {
    const rules = deckRules("deck\tkind\tvalue\n01-mathematics\tcip\t27\n01-mathematics\tlevel_from\tupper-secondary\n02-physics\tcip\t40.08\n00-learning\tfield\tmeta-learning\n");
    expect(rules).toEqual({ "01-mathematics": { cip: ["27"], field: [] }, "02-physics": { cip: ["40.08"], field: [] }, "00-learning": { cip: [], field: ["meta-learning"] } });
    expect(decksOf(rules, "27.0101", null)).toEqual(["01-mathematics"]);
    expect(decksOf(rules, "40.0801", "meta-learning")).toEqual(["02-physics", "00-learning"]);
    expect(decksOf(rules, "45.01", null)).toEqual([]);
    expect(decksOf(rules, null, null)).toEqual([]);
  });
});

describe("review rows route", () => {
  let s: Serve | null = null;
  afterEach(() => {
    s?.stop();
    s = null;
  });

  test("search stays inside the deck, ranks a label match first, and a row with no label is found by its code", () => {
    expect(searchRows(PACK, "01-mathematics", "calculus").map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(searchRows(PACK, "01-mathematics", "linear calculus").map((r) => r.id)).toEqual(["r2"]);
    expect(searchRows(PACK, "01-mathematics", "7.G.A.1")).toEqual([{ id: "r3", table: "progression", code: "7.G.A.1", label: null, level: "undergraduate-lower", where: "a-restricted-system", url: "https://example.org/math", cip: "27.01" }]);
    expect(searchRows(PACK, "01-mathematics", "mechanics")).toEqual([]);
    expect(searchRows(PACK, null, "mechanics").map((r) => r.id)).toEqual(["r4"]);
    expect(searchRows(PACK, "01-mathematics", "   ")).toEqual([]);
    const many = { ...PACK, rows: Array.from({ length: 80 }, (_, i) => row({ id: `m${String(i).padStart(2, "0")}`, label: `Calculus ${i}` })) };
    expect(searchRows(many, "01-mathematics", "calculus").length).toBe(ALIGNMENT_HITS);
    expect(searchRows(EMPTY_REVIEW, null, "calculus")).toEqual([]);
  });

  test("answers 401 with no token, returns rows by id without their deck list, and refuses a long or odd list", async () => {
    const ME = 4242;
    const token = "c".repeat(43);
    s = startServe({ uid: ME, resolvePeerUid: () => ME, cliToken: token, routes: alignmentRoutes(PACK) });
    const base = `http://127.0.0.1:${s.port}`;
    const host = `127.0.0.1:${s.port}`;
    const get = (path: string, auth = true) => fetch(`${base}${path}`, { headers: auth ? { host, authorization: `Bucket ${token}` } : { host } });
    expect((await get("/local/workspace/alignment/rows?ids=r1", false)).status).toBe(401);
    expect((await get("/local/workspace/alignment/search?q=calculus", false)).status).toBe(401);
    const rows = (await (await get("/local/workspace/alignment/rows?ids=r1,r3,absent")).json()) as { staff: boolean; rows: Record<string, unknown>[] };
    expect([rows.staff, rows.rows.map((r) => r.id), rows.rows.every((r) => !("decks" in r))]).toEqual([true, ["r1", "r3"], true]);
    expect((await get(`/local/workspace/alignment/rows?ids=${Array.from({ length: ALIGNMENT_IDS + 1 }, (_, i) => `x${i}`).join(",")}`)).status).toBe(400);
    expect((await get("/local/workspace/alignment/rows?ids=..%2Fetc")).status).toBe(400);
    expect((await get("/local/workspace/alignment/search?deck=Bad_Deck&q=x")).status).toBe(400);
    expect((await get(`/local/workspace/alignment/search?q=${"x".repeat(121)}`)).status).toBe(400);
    const found = (await (await get("/local/workspace/alignment/search?deck=02-physics&q=mechanics")).json()) as { rows: { id: string }[] };
    expect(found.rows.map((r) => r.id)).toEqual(["r4"]);
    expect(Object.keys(alignmentRoutes(EMPTY_REVIEW))).toEqual(["GET /local/workspace/alignment/rows", "GET /local/workspace/alignment/search"]);
  });
});

const LINKS = "data/review-fixture/links.jsonl";
const NOTES = "data/review-fixture/decisions.jsonl";
const line = (id: string, atom: string) => `{"schema": "bucket.alignment/1", "id": "${id}", "progression_id": "${id.split("~")[0].replace("align:", "")}", "table": "courses", "level": "graduate", "atom": "${atom}", "match": "broader", "score": 0.717, "source_url": "https://example.org/c", "status": "unreviewed-proposal", "verified": false, "verification": {"status": "asserted", "by": "agent", "at": "2026-10-12"}, "note": ""}`;
const SHIPPED = `${[line("align:c1~01-mathematics/limits", "atom:01-mathematics/limits"), line("align:c2~01-mathematics/limits", "atom:01-mathematics/limits"), line("align:c3~01-mathematics/series", "atom:01-mathematics/series"), line("align:c4~01-mathematics/series", "atom:01-mathematics/series")].join("\n")}\n`;

function fixture(withQueue: boolean) {
  const files: Record<string, string> = { "data/review-fixture/README.md": "# Review fixture\n", [LINKS]: SHIPPED, [NOTES]: "" };
  const blobs: Record<string, ReturnType<typeof encodeBlob>> = {};
  const packed: PackedFile[] = Object.entries(files).map(([path, body]) => {
    const bytes = Buffer.from(body);
    blobs[sha256(bytes)] = encodeBlob(bytes);
    return { path, sha256: sha256(bytes), size: bytes.length, audience: "staff", role: "table" };
  });
  const manifest: ReportRecord = {
    schema: "bucket.report/2",
    slug: withQueue ? REVIEW_SLUG : "another-output",
    title: "Atom alignment, review queue",
    authors: ["Bucket Foundation"],
    date: "2026-10-12",
    status: "private",
    kind: "dataset-report",
    source_path: "data/review-fixture/README.md",
    source_hash: sha256(Buffer.from(files["data/review-fixture/README.md"])),
    tables: [
      { id: "alignments", path: LINKS, format: "jsonl", label: "Proposed links", licence: "CC-BY-4.0", audience: "staff" },
      { id: "decisions", path: NOTES, format: "jsonl", label: "Review decisions", licence: "CC-BY-4.0", audience: "staff", editable: true },
    ],
  };
  const version = sha256(JSON.stringify(packed)).slice(0, 16);
  const index: ResearchIndex = { schema: RESEARCH_SCHEMA, version, staff: true, outputs: [{ slug: manifest.slug, origin: "staff", manifest, files: packed.sort((a, b) => (a.path < b.path ? -1 : 1)), withheld: 0 }] };
  const home = temp("home");
  const research = new Research({ index, blobs: async () => ({ version, blobs }) }, temp("cache"), home);
  const work = new ResearchWork(research, home, { now: () => Date.UTC(2026, 9, 12, 12, 0, 0), open: () => {} });
  const src: WorkspaceSources = { research, changedPaths: (slug) => work.changedPaths(slug), datasets: () => [], rowSets: () => [] };
  return { research, work, src, home, slug: manifest.slug };
}

const decision = (link: string, kind: Decision["decision"], reason: Decision["reason"] = null): Decision => ({ schema: DECISION_SCHEMA, atom: link.includes("limits") ? "atom:01-mathematics/limits" : "atom:01-mathematics/series", link, row: link.split("~")[0].replace("align:", ""), decision: kind, reason, reviewer: "Ada Example", at: "2026-10-13" });

describe("review queue in the workspace index and its export", () => {
  test("the Graphs index lists the queue when the build holds it and nothing when it does not", async () => {
    const held = fixture(true);
    const items = workspaceItems(held.src, "graphs");
    expect(items).toEqual([{ type: "graphs", key: `output:${REVIEW_SLUG}:review`, title: "Atom alignment, review queue", from: { kind: "output", id: REVIEW_SLUG, title: "Atom alignment, review queue" }, origin: "staff", licence: "", changed: false, opens: `#/workspace/graphs/${REVIEW_SLUG}`, explore: null }]);
    await held.work.write(REVIEW_SLUG, NOTES, sha256(Buffer.from("")), Buffer.from(applyDecision("", decision("align:c1~01-mathematics/limits", "right"))));
    expect(workspaceItems(held.src, "graphs")[0].changed).toBe(true);
    expect(workspaceItems(fixture(false).src, "graphs")).toEqual([]);
    expect(workspaceItems(held.src, "tables").map((i) => i.key)).toEqual([`output:${REVIEW_SLUG}:alignments`, `output:${REVIEW_SLUG}:decisions`]);
  });

  test("decisions live in the working copy, the shipped table is untouched, and the export is a patch git accepts that verifies the rows marked right alone", async () => {
    const { research, work, slug } = fixture(true);
    let notes = "";
    for (const d of [decision("align:c1~01-mathematics/limits", "right"), decision("align:c2~01-mathematics/limits", "partly", "broader"), decision("align:c3~01-mathematics/series", "wrong"), decision("align:c4~01-mathematics/series", "right")]) notes = applyDecision(notes, d);
    notes = applyDecision(notes, { ...decision("align:c4~01-mathematics/series", "wrong") });
    await work.write(slug, NOTES, sha256(Buffer.from("")), Buffer.from(notes));
    expect((await research.read(slug, LINKS)).bytes.toString("utf8")).toBe(SHIPPED);
    expect((await research.read(slug, NOTES, { baseline: true })).bytes.toString("utf8")).toBe("");
    const next = verifiedTable(SHIPPED, parseDecisions(notes));
    expect(next.verified).toBe(1);
    await work.write(slug, LINKS, sha256(Buffer.from(SHIPPED)), Buffer.from(next.text));
    const made = await work.exportOutput(slug);
    expect(made.files).toContain("CHANGES.patch");
    const patch = readFileSync(join(made.dir, "CHANGES.patch"), "utf8");
    const repo = temp("repo");
    for (const [path, body] of [[LINKS, SHIPPED], [NOTES, ""]] as const) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), body);
    }
    const git = (...args: string[]) => Bun.spawnSync(["git", ...args], { cwd: repo, stdout: "pipe", stderr: "pipe" });
    expect(git("init", "-q").exitCode).toBe(0);
    writeFileSync(join(repo, "review.patch"), patch);
    const check = git("apply", "--check", "review.patch");
    expect([check.exitCode, check.stderr.toString()]).toEqual([0, ""]);
    expect(git("apply", "review.patch").exitCode).toBe(0);
    const rows = readFileSync(join(repo, LINKS), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { id: string; verified: boolean; verification: Record<string, string>; status: string });
    expect(rows.map((r) => [r.id.slice(6, 8), r.verified, r.verification.status, r.verification.by, r.verification.at])).toEqual([
      ["c1", true, "verified", "Ada Example", "2026-10-13"],
      ["c2", false, "asserted", "agent", "2026-10-12"],
      ["c3", false, "asserted", "agent", "2026-10-12"],
      ["c4", false, "asserted", "agent", "2026-10-12"],
    ]);
    expect(readFileSync(join(repo, LINKS), "utf8").split("\n").slice(1).join("\n")).toBe(SHIPPED.split("\n").slice(1).join("\n"));
    const kept = parseDecisions(readFileSync(join(repo, NOTES), "utf8"));
    expect(kept.map((d) => [d.link!.slice(6, 8), d.decision, d.reason, d.reviewer, d.at])).toEqual([
      ["c1", "right", null, "Ada Example", "2026-10-13"],
      ["c2", "partly", "broader", "Ada Example", "2026-10-13"],
      ["c3", "wrong", null, "Ada Example", "2026-10-13"],
      ["c4", "wrong", null, "Ada Example", "2026-10-13"],
    ]);
  });
});
