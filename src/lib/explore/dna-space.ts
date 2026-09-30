import { CHROMOSOMES, CHROM_LENGTH_GRCH37, GENOME_LENGTH, SNPS, detectFormat, genomeOffset, parseVariantLine, type Variant } from "./genome/parse";
import { SPACE_SCHEMA, type Dataset, type SpaceMark, type SpaceObservation } from "./space";

export const DNA_WINDOWS = 96;
export const TARGET_PER_WINDOW = 12;
export const BASES = ["A", "C", "G", "T"] as const;
export type Base = (typeof BASES)[number];
export const COMPLEMENT: Record<Base, Base> = { A: "T", C: "G", G: "C", T: "A" };

export const DNA_FEATURES = ["variant density", "heterozygous", "homozygous", "no call", "A", "C", "G", "T", "GC content", "purine", "indel", "annotated"] as const;

const SNP_BY_RSID = new Map(SNPS.map((s) => [s.rsid, s]));
const MB = 1_000_000;

export interface WindowStats {
  count: number;
  het: number;
  hom: number;
  nocall: number;
  bases: Record<Base, number>;
  called: number;
  indel: number;
  annotated: number;
}

export function emptyWindow(): WindowStats {
  return { count: 0, het: 0, hom: 0, nocall: 0, bases: { A: 0, C: 0, G: 0, T: 0 }, called: 0, indel: 0, annotated: 0 };
}

export function windowOf(chrom: string, pos: number, windows = DNA_WINDOWS): number {
  return Math.min(windows - 1, Math.floor((genomeOffset(chrom, pos) / GENOME_LENGTH) * windows));
}

export function addVariant(w: WindowStats, v: Variant, annotated: boolean): void {
  w.count++;
  if (annotated) w.annotated++;
  const g = v.genotype.toUpperCase();
  if (/^[-0.]+$/.test(g) || g === "") {
    w.nocall++;
    return;
  }
  if (/[ID]/.test(g)) {
    w.indel++;
    return;
  }
  const alleles = g.replace(/[^ACGT]/g, "").split("");
  if (!alleles.length) {
    w.nocall++;
    return;
  }
  for (const a of alleles) {
    w.bases[a as Base]++;
    w.called++;
  }
  if (alleles.length >= 2 && new Set(alleles).size > 1) w.het++;
  else w.hom++;
}

export function featureRow(w: WindowStats): number[] {
  const n = Math.max(1, w.count);
  const c = Math.max(1, w.called);
  const b = w.bases;
  return [w.count, w.het / n, w.hom / n, w.nocall / n, b.A / c, b.C / c, b.G / c, b.T / c, (b.C + b.G) / c, (b.A + b.G) / c, w.indel / n, w.annotated / n];
}

export function standardize(rows: number[][], active: boolean[]): number[][] {
  const k = rows[0]?.length ?? 0;
  const out = rows.map((r) => r.slice());
  for (let j = 0; j < k; j++) {
    const vals = rows.filter((_, i) => active[i]).map((r) => r[j]);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const variance = vals.length ? vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length : 0;
    const sd = Math.sqrt(variance) || 1;
    rows.forEach((r, i) => {
      out[i][j] = active[i] ? (r[j] - mean) / sd : 0;
    });
  }
  return out;
}

export function dominantBase(w: WindowStats): Base {
  let best: Base = "A";
  for (const b of BASES) if (w.bases[b] > w.bases[best]) best = b;
  return best;
}

export function windowLabel(index: number, windows = DNA_WINDOWS): string {
  const start = (index / windows) * GENOME_LENGTH;
  const end = ((index + 1) / windows) * GENOME_LENGTH;
  let off = 0;
  for (const c of CHROMOSOMES) {
    const len = CHROM_LENGTH_GRCH37[c];
    if (start < off + len) {
      const from = Math.max(0, start - off);
      const to = Math.min(len, end - off);
      return `chr${c}:${(from / MB).toFixed(0)}-${(to / MB).toFixed(0)} Mb`;
    }
    off += len;
  }
  return `window ${index + 1}`;
}

export function chromosomeBins(): { label: string; from: number; to: number }[] {
  let off = 0;
  return CHROMOSOMES.map((c) => {
    const from = off / MB;
    off += CHROM_LENGTH_GRCH37[c];
    return { label: `chr${c}`, from, to: off / MB };
  });
}

export function genomeSpace(text: string, id: string, label: string, windows = DNA_WINDOWS): Dataset {
  const format = detectFormat(text);
  if (format === "unknown" || format === "fasta") throw new Error("Use a 23andMe or AncestryDNA txt, or a VCF, to see DNA on the helicoid.");
  const stats = Array.from({ length: windows }, emptyWindow);
  const marks: SpaceMark[] = [];
  let variants = 0;
  for (const line of text.split(/\r?\n/)) {
    const v = parseVariantLine(line, format);
    if (!v) continue;
    variants++;
    const snp = v.rsid ? SNP_BY_RSID.get(v.rsid) : undefined;
    addVariant(stats[windowOf(v.chrom, v.pos, windows)], v, !!snp);
    if (snp) marks.push({ t: genomeOffset(v.chrom, v.pos) / MB, label: `${snp.gene} ${v.rsid}`, kind: "locus" });
  }
  if (!variants) throw new Error("No variants were found in the file.");
  const rows = stats.map(featureRow);
  const active = stats.map((w) => w.count > 0);
  const z = standardize(rows, active);
  const obs: SpaceObservation[] = stats.map((w, i) => ({
    id: `window:${i}`,
    title: windowLabel(i, windows),
    scores: z[i].map((v) => Math.round(v * 1000) / 1000),
    t: Math.round(((i + 0.5) / windows) * (GENOME_LENGTH / MB) * 10) / 10,
    meta: { variants: w.count, base: w.count ? dominantBase(w) : "", chromosome: windowLabel(i, windows).split(":")[0] },
    links: [],
    coverage: Math.min(1, w.count / TARGET_PER_WINDOW),
  }));
  const k = DNA_FEATURES.length;
  return {
    schema: SPACE_SCHEMA,
    id,
    label,
    basis: "own",
    scale: "standardized",
    fields: [{ key: "genotype", kind: "category" }, { key: "position", kind: "time" }],
    components: DNA_FEATURES.map((name, i) => ({ index: i + 1, angle_deg: (((90 - (360 * i) / k) % 360) + 360) % 360, variance_ratio: 1 / k, label: name, top_terms: [name], bottom_terms: [] })),
    mean: new Array<number>(k).fill(0),
    sweep: { field: "position", bins: chromosomeBins() },
    marks,
    obs,
  };
}
