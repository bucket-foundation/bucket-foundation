import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sourceHitId, sourceUrl, type SourceIndex, type SourceKind, type SourceRow } from "../src/lib/explore/sources";

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
  basis: string;
  basis_verified: boolean;
  reviewer: string;
  date: string;
  disputed?: boolean;
  dispute_reason?: string;
  note?: string;
  index_differs?: Partial<Record<Field, string>>;
}

type Field = "title" | "author" | "year";
const FIELDS: Field[] = ["title", "author", "year"];

interface FoundingWorks {
  status: string;
  drafted_from_memory: boolean;
  year_tolerance: number;
  tiers: Record<string, string>;
  work_kinds: Record<string, SourceKind>;
  rows: Row[];
}

const data = JSON.parse(fs.readFileSync(FILE, "utf8")) as FoundingWorks;
const index = JSON.parse(fs.readFileSync(INDEX, "utf8")) as SourceIndex;
const held = new Map(index.items.map((r) => [sourceHitId(r[0], r[1]), r]));

function primaryFiles(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? primaryFiles(`${dir}/${e.name}`) : e.name === PRIMARY_FILE ? [`${dir}/${e.name}`] : []));
}

const norm = (v: string) => v.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
const firstFamily = (author: string) => norm(author.split(/,| and /)[0].trim().split(/\s+/).pop() ?? "");

export function differences(work: Row["work"], row: SourceRow, yearTolerance: number): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {};
  const [mine, theirs] = [norm(work.title), norm(row[2])];
  if (!mine || !(mine.includes(theirs) || theirs.includes(mine))) out.title = `${JSON.stringify(work.title)} against ${JSON.stringify(row[2])}`;
  const family = firstFamily(work.author);
  if (!family || !norm(row[5]).includes(family)) out.author = `${JSON.stringify(work.author)} against ${JSON.stringify(row[5])}`;
  if (row[3] === null || Math.abs(row[3] - work.year) > yearTolerance) out.year = `${work.year} against ${row[3]}`;
  return out;
}

export function problems(rows: Row[], kinds: Record<string, SourceKind>, tiers: Record<string, string>, find: (id: string) => SourceRow | undefined, exists: (file: string) => boolean, yearTolerance: number): string[] {
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
    const complete = !!r.work?.title && !!r.work?.author && Number.isInteger(r.work?.year);
    if (!complete) out.push(`${at}: work needs a title, an author and a year`);
    const kind = kinds[r.work?.kind];
    const row = kind && typeof r.work.id === "string" && r.work.id ? find(sourceHitId(kind, r.work.id)) : undefined;
    if (!kind || typeof r.work.id !== "string" || !r.work.id) out.push(`${at}: work has no known kind or id`);
    else if (!row) out.push(`${at}: ${r.work.kind} ${r.work.id} is not in the index`);
    else if (complete) {
      const found = differences(r.work, row, yearTolerance);
      const declared = r.index_differs ?? {};
      for (const f of FIELDS) {
        if (found[f] && !declared[f]) out.push(`${at}: ${f} differs from the index row, ${found[f]}`);
        if (!found[f] && f in declared) out.push(`${at}: index_differs.${f} is declared and the ${f} matches the index row`);
      }
    }
    if (!(r.tier in tiers)) out.push(`${at}: unknown tier ${r.tier}`);
    if (typeof r.source !== "string" || !r.source || !exists(r.source)) out.push(`${at}: source file ${r.source} does not exist`);
    if (typeof r.basis !== "string" || !r.basis.trim()) out.push(`${at}: basis is missing`);
    else if (/^[\w./-]+:\d+$/.test(r.basis) && !exists(r.basis.replace(/:\d+$/, ""))) out.push(`${at}: basis file ${r.basis} does not exist`);
    if (typeof r.basis_verified !== "boolean") out.push(`${at}: basis_verified is not a boolean`);
    if (typeof r.reviewer !== "string") out.push(`${at}: reviewer field is missing`);
    else if (r.reviewer.trim() && r.basis_verified !== true) out.push(`${at}: a reviewer signed a row whose basis is unverified`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? "")) out.push(`${at}: date is not YYYY-MM-DD`);
    if (r.disputed !== undefined && r.disputed !== true) out.push(`${at}: disputed is true or absent`);
    if ((r.disputed === true) !== (typeof r.dispute_reason === "string" && r.dispute_reason.length > 0)) out.push(`${at}: disputed and dispute_reason go together`);
  }
  return out;
}

const exists = (file: string) => !path.isAbsolute(file) && !file.includes("..") && fs.existsSync(path.join(ROOT, file));
const check = (rows: Row[]) => problems(rows, data.work_kinds, data.tiers, (id) => held.get(id), exists, data.year_tolerance);

test("every row is well formed and its title, first author and year agree with the index row", () => {
  assert.deepEqual(check(data.rows), []);
});

test("every sub-field with a primary-papers yaml has one row, and the audit's founders are present", () => {
  const files = primaryFiles(CANON_DIR).sort();
  assert.equal(files.length, 36);
  const sources = data.rows.map((r) => r.source);
  for (const f of files) assert.ok(sources.filter((s) => s === f).length >= 1, `${f} has no row`);
  for (const c of FOUNDERS) assert.ok(data.rows.some((r) => r.concept === c), `${c} has no row`);
  assert.ok(data.rows.every((r) => files.includes(r.source) || FOUNDERS.includes(r.concept)));
});

test("the file is a draft and each work links out", () => {
  assert.equal(data.status, "draft");
  assert.equal(data.drafted_from_memory, true);
  assert.equal(data.year_tolerance, 1);
  for (const r of data.rows) {
    const row = held.get(sourceHitId(data.work_kinds[r.work.kind], r.work.id)) as SourceRow;
    if (row[3] !== r.work.year) console.log(`year differs for ${r.concept}: ${r.work.year} against ${row[3]} in the index, ${r.index_differs?.year ?? `within the ${data.year_tolerance} year tolerance for volume and issue dates`}`);
    for (const f of ["title", "author"] as Field[]) if (r.index_differs?.[f]) console.log(`${f} differs for ${r.concept}: ${differences(r.work, row, data.year_tolerance)[f]}, ${r.index_differs[f]}`);
  }
  for (const r of data.rows) assert.match(sourceUrl(data.work_kinds[r.work.kind], r.work.id) ?? "", /^https:\/\//, r.concept);
  const approved = data.rows.filter((r) => r.reviewer.trim()).length;
  const disputed = data.rows.filter((r) => r.disputed).length;
  const verified = data.rows.filter((r) => r.basis_verified).length;
  console.log(`founding works: ${data.rows.length} rows, ${approved} approved by a reviewer, ${verified} with a verified basis, ${disputed} disputed`);
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
  assert.ok(bad({ disputed: true, dispute_reason: undefined }), "disputed without a reason");
  assert.ok(bad({ work: { ...good.work, title: "Another Title Entirely" } }), "a title unlike the index row");
  assert.ok(bad({ work: { ...good.work, author: "Someone Else" } }), "a first author unlike the index row");
  assert.ok(bad({ work: { ...good.work, year: good.work.year + 2 } }), "a year outside the tolerance");
  assert.deepEqual(check([{ ...good, work: { ...good.work, year: good.work.year + 1 } }]), [], "a year inside the tolerance");
  assert.deepEqual(check([{ ...good, work: { ...good.work, year: good.work.year + 2 }, index_differs: { year: "reprint" } }]), [], "a declared year difference");
  assert.ok(bad({ index_differs: { title: "no difference exists" } }), "a declared difference that does not exist");
  assert.ok(bad({ basis: "" }), "no basis");
  assert.ok(bad({ basis: "bucket-canon/none.yaml:3" }), "a basis file that does not exist");
  assert.ok(bad({ basis_verified: undefined as unknown as boolean }), "no basis_verified flag");
  assert.ok(bad({ reviewer: "A. Person" }), "a signed row with an unverified basis");
  assert.deepEqual(check([{ ...good, reviewer: "A. Person", basis_verified: true }]), [], "a signed row with a verified basis");
  assert.ok(bad({ dispute_reason: "why" }), "a reason without disputed");
});
