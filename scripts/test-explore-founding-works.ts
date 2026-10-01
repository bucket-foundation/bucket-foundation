import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sourceHitId, sourceUrl, type SourceIndex, type SourceKind } from "../src/lib/explore/sources";

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "src", "data", "founding-works.json");
const INDEX = path.join(ROOT, "src", "data", "explore-sources.json");
const CANON_DIR = "bucket-canon";
const PRIMARY_FILE = "primary-papers.yaml";
const FOUNDERS = ["natural selection", "conservation of mass", "information entropy"];

interface Row {
  concept: string;
  aliases: string[];
  work: { kind: string; id: string; title: string; author: string; year: number };
  tier: string;
  source: string;
  reviewer: string;
  date: string;
  disputed?: boolean;
  dispute_reason?: string;
  note?: string;
}

interface FoundingWorks {
  status: string;
  tiers: Record<string, string>;
  work_kinds: Record<string, SourceKind>;
  rows: Row[];
}

const data = JSON.parse(fs.readFileSync(FILE, "utf8")) as FoundingWorks;
const index = JSON.parse(fs.readFileSync(INDEX, "utf8")) as SourceIndex;
const held = new Set(index.items.map((r) => sourceHitId(r[0], r[1])));

function primaryFiles(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? primaryFiles(`${dir}/${e.name}`) : e.name === PRIMARY_FILE ? [`${dir}/${e.name}`] : []));
}

export function problems(rows: Row[], kinds: Record<string, SourceKind>, tiers: Record<string, string>, has: (id: string) => boolean, exists: (file: string) => boolean): string[] {
  const out: string[] = [];
  const concepts = new Set<string>();
  const names = new Set<string>();
  for (const r of rows) {
    const at = r.concept || "row without a concept";
    if (!r.concept || r.concept !== r.concept.toLowerCase().trim()) out.push(`${at}: concept is empty or not lowercase`);
    if (concepts.has(r.concept)) out.push(`${at}: concept appears twice`);
    concepts.add(r.concept);
    if (!Array.isArray(r.aliases)) out.push(`${at}: aliases is not a list`);
    for (const name of [r.concept, ...(Array.isArray(r.aliases) ? r.aliases : [])]) {
      if (typeof name !== "string" || !name || name !== name.toLowerCase().trim()) out.push(`${at}: alias ${JSON.stringify(name)} is empty or not lowercase`);
      else if (names.has(name)) out.push(`${at}: ${name} is already a concept or alias`);
      names.add(name);
    }
    const kind = kinds[r.work?.kind];
    if (!kind || typeof r.work.id !== "string" || !r.work.id) out.push(`${at}: work has no known kind or id`);
    else if (!has(sourceHitId(kind, r.work.id))) out.push(`${at}: ${r.work.kind} ${r.work.id} is not in the index`);
    if (!r.work?.title || !r.work?.author || !Number.isInteger(r.work?.year)) out.push(`${at}: work needs a title, an author and a year`);
    if (!(r.tier in tiers)) out.push(`${at}: unknown tier ${r.tier}`);
    if (typeof r.source !== "string" || !r.source || !exists(r.source)) out.push(`${at}: source file ${r.source} does not exist`);
    if (typeof r.reviewer !== "string") out.push(`${at}: reviewer field is missing`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? "")) out.push(`${at}: date is not YYYY-MM-DD`);
    if (r.disputed !== undefined && r.disputed !== true) out.push(`${at}: disputed is true or absent`);
    if ((r.disputed === true) !== (typeof r.dispute_reason === "string" && r.dispute_reason.length > 0)) out.push(`${at}: disputed and dispute_reason go together`);
  }
  return out;
}

const exists = (file: string) => !path.isAbsolute(file) && !file.includes("..") && fs.existsSync(path.join(ROOT, file));
const check = (rows: Row[]) => problems(rows, data.work_kinds, data.tiers, (id) => held.has(id), exists);

test("every founding-works row is well formed and its work id resolves in the index", () => {
  assert.deepEqual(check(data.rows), []);
});

test("every sub-field with a primary-papers yaml has one row, and the audit's founders are present", () => {
  const files = primaryFiles(CANON_DIR).sort();
  assert.equal(files.length, 36);
  const sources = data.rows.map((r) => r.source);
  for (const f of files) assert.ok(sources.filter((s) => s === f).length >= 1, `${f} has no row`);
  for (const c of FOUNDERS) assert.ok(data.rows.some((r) => r.concept === c), `${c} has no row`);
  assert.equal(data.rows.length, files.length + FOUNDERS.length);
});

test("the file is a draft and each work links out", () => {
  assert.equal(data.status, "draft");
  for (const r of data.rows) assert.match(sourceUrl(data.work_kinds[r.work.kind], r.work.id) ?? "", /^https:\/\//, r.concept);
  const approved = data.rows.filter((r) => r.reviewer.trim()).length;
  const disputed = data.rows.filter((r) => r.disputed).length;
  console.log(`founding works: ${data.rows.length} rows, ${approved} approved by a reviewer, ${disputed} disputed`);
});

test("the validator rejects each kind of bad row", () => {
  const good = data.rows[0];
  const other = data.rows[1];
  const bad = (patch: Partial<Row>, extra: Row[] = []) => check([{ ...good, ...patch }, ...extra]).length > 0;
  assert.deepEqual(check([good, other]), []);
  assert.ok(bad({}, [good]), "a concept twice");
  assert.ok(bad({ aliases: ["Turing Machine"] }), "an uppercase alias");
  assert.ok(bad({ aliases: ["x", "x"] }), "an alias twice in one row");
  assert.ok(bad({ aliases: [other.concept] }, [other]), "an alias equal to another concept");
  assert.ok(bad({ aliases: [other.aliases[0]] }, [other]), "an alias shared by two rows");
  assert.ok(bad({ work: { ...good.work, id: "10.0000/not-held" } }), "an id outside the index");
  assert.ok(bad({ work: { ...good.work, kind: "isbn" } }), "an unknown id kind");
  assert.ok(bad({ tier: "gold" }), "an unknown tier");
  assert.ok(bad({ source: "bucket-canon/none.yaml" }), "a missing source file");
  assert.ok(bad({ source: "../outside.json" }), "a source outside the repo");
  assert.ok(bad({ reviewer: undefined as unknown as string }), "no reviewer field");
  assert.ok(bad({ date: "October 2026" }), "a malformed date");
  assert.ok(bad({ disputed: true }), "disputed without a reason");
  assert.ok(bad({ dispute_reason: "why" }), "a reason without disputed");
});
