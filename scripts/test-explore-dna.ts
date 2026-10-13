import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BASES, COMPLEMENT, DNA_FEATURES, DNA_WINDOWS, addVariant, chromosomeBins, dominantBase, emptyWindow, featureRow, genomeSpace, standardize, windowLabel, windowOf } from "../src/lib/explore/dna-space";
import { parseDataset } from "../src/lib/explore/space";
import { makeSlices } from "../src/lib/explore/slices";
import { lociOf, rungsOf } from "../src/lib/explore/helicoid";
import { GENOME_LENGTH } from "../src/lib/explore/genome/parse";

const sample = fs.readFileSync(path.resolve(__dirname, "../public/explore/sample-genome.txt"), "utf8");

test("windows cover the genome in order", () => {
  assert.equal(windowOf("1", 1), 0);
  assert.equal(windowOf("MT", 16569), DNA_WINDOWS - 1);
  assert.ok(windowOf("2", 1) > windowOf("1", 1));
  assert.match(windowLabel(0), /^chr1:0-/);
  assert.equal(windowLabel(DNA_WINDOWS - 1).startsWith("chr"), true);
});

test("per-window base and genotype features count what the genotypes say", () => {
  const w = emptyWindow();
  addVariant(w, { rsid: null, chrom: "1", pos: 1, genotype: "AA" }, false);
  addVariant(w, { rsid: null, chrom: "1", pos: 2, genotype: "CT" }, true);
  addVariant(w, { rsid: null, chrom: "1", pos: 3, genotype: "--" }, false);
  addVariant(w, { rsid: null, chrom: "1", pos: 4, genotype: "DI" }, false);
  assert.equal(w.count, 4);
  assert.equal(w.hom, 1);
  assert.equal(w.het, 1);
  assert.equal(w.nocall, 1);
  assert.equal(w.indel, 1);
  assert.equal(w.annotated, 1);
  assert.deepEqual(w.bases, { A: 2, C: 1, G: 0, T: 1 });
  const row = featureRow(w);
  assert.equal(row.length, DNA_FEATURES.length);
  assert.equal(row[0], 4);
  assert.ok(Math.abs(row[4] - 0.5) < 1e-12);
  assert.ok(Math.abs(row[8] - 0.25) < 1e-12);
  assert.ok(Math.abs(row[9] - 0.5) < 1e-12);
  assert.equal(dominantBase(w), "A");
});

test("complement pairs close", () => {
  for (const b of BASES) assert.equal(COMPLEMENT[COMPLEMENT[b]], b);
});

test("standardizing ignores empty windows and gives zero mean, unit spread", () => {
  const rows = [[1, 10], [3, 10], [5, 10], [99, 99]];
  const z = standardize(rows, [true, true, true, false]);
  assert.deepEqual(z[3], [0, 0]);
  assert.ok(Math.abs((z[0][0] + z[1][0] + z[2][0]) / 3) < 1e-12);
  assert.deepEqual([z[0][1], z[1][1], z[2][1]], [0, 0, 0]);
});

test("the sample genome becomes a dataset on its own basis with chromosome sweep bins", () => {
  const ds = genomeSpace(sample, "dna-sample", "sample genome");
  assert.equal(ds.obs.length, DNA_WINDOWS);
  assert.equal(ds.components.length, 12);
  assert.equal(ds.basis, "own");
  assert.equal(ds.scale, "standardized");
  assert.ok(ds.obs.every((o) => o.scores.length === 12 && o.scores.every(Number.isFinite)));
  assert.ok(ds.obs.some((o) => (o.coverage as number) > 0) && ds.obs.some((o) => (o.coverage as number) === 0));
  assert.deepEqual(chromosomeBins().length, 25);
  assert.ok(ds.sweep && ds.sweep.bins.length === 25);
  const ts = ds.obs.map((o) => o.t as number);
  assert.deepEqual(ts, ts.slice().sort((a, b) => a - b));
  assert.ok(ts[ts.length - 1] <= GENOME_LENGTH / 1e6);
});

test("annotated SNPs become loci marks and the dataset survives the contract", () => {
  const ds = genomeSpace(sample, "dna-sample", "sample genome");
  assert.ok((ds.marks ?? []).length > 3);
  assert.ok((ds.marks ?? []).some((m) => /MTHFR/.test(m.label)));
  const back = parseDataset(JSON.parse(JSON.stringify(ds)));
  assert.equal(back.obs.length, ds.obs.length);
  assert.equal(back.marks?.length, ds.marks?.length);
  assert.equal(back.basis, "own");
  assert.ok(makeSlices(back).length >= 3);
  assert.equal(rungsOf(back).length, DNA_WINDOWS);
  assert.equal(lociOf(back).length, ds.marks?.length);
});

test("files that are not genotype tables are refused with a reason", () => {
  assert.throws(() => genomeSpace(">seq\nACGT\n", "x", "x"), /23andMe/);
  assert.throws(() => genomeSpace("hello\nworld\n", "x", "x"), /23andMe/);
  assert.throws(() => genomeSpace("# rsid\tchromosome\tposition\tgenotype\n", "x", "x"), /No variants|23andMe/);
});

test("a VCF parses into the same window structure", () => {
  const vcf = ["##fileformat=VCFv4.2", "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS", "1\t11856378\trs1801133\tC\tT\t.\t.\t.\tGT\t0/1", "2\t136608646\trs4988235\tA\tG\t.\t.\t.\tGT\t1/1"].join("\n");
  const ds = genomeSpace(vcf, "dna-upload", "your DNA");
  assert.equal(ds.obs.filter((o) => (o.meta.variants as number) > 0).length, 2);
  assert.equal(ds.marks?.length, 2);
});
