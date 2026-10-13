import snpData from "../fixtures/snps.json";

export type GenomeFormat = "23andme" | "ancestry" | "vcf" | "fasta" | "unknown";

export const CHROMOSOMES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "X", "Y", "MT"];

export const CHROM_LENGTH_GRCH37: Record<string, number> = {
  "1": 249250621, "2": 243199373, "3": 198022430, "4": 191154276, "5": 180915260, "6": 171115067,
  "7": 159138663, "8": 146364022, "9": 141213431, "10": 135534747, "11": 135006516, "12": 133851895,
  "13": 115169878, "14": 107349540, "15": 102531392, "16": 90354753, "17": 81195210, "18": 78077248,
  "19": 59128983, "20": 63025520, "21": 48129895, "22": 51304566, X: 155270560, Y: 59373566, MT: 16569,
};

export interface Variant {
  rsid: string | null;
  chrom: string;
  pos: number;
  genotype: string;
}

export interface Annotated extends Variant {
  gene: string;
  note: string;
}

export interface FastaRecord {
  name: string;
  length: number;
  gc: number;
}

export interface GenomeSummary {
  format: GenomeFormat;
  variantCount: number;
  perChrom: Record<string, number>;
  markers: Variant[];
  annotated: Annotated[];
  fasta: FastaRecord[];
  skipped: number;
}

export interface Snp {
  rsid: string;
  gene: string;
  chrom: string;
  pos: number;
  note: string;
}

export const SNPS: Snp[] = snpData.snps;
const SNP_BY_RSID = new Map(SNPS.map((s) => [s.rsid, s]));

export function normChrom(c: string): string | null {
  const s = c.trim().replace(/^chr/i, "").toUpperCase();
  if (s === "M" || s === "MT") return "MT";
  if (s === "23") return "X";
  if (s === "24") return "Y";
  if (s === "25") return "X";
  if (s === "26") return "MT";
  return CHROMOSOMES.includes(s) ? s : null;
}

export function detectFormat(text: string): GenomeFormat {
  const head = text.slice(0, 4000);
  if (/^##fileformat=VCF/m.test(head)) return "vcf";
  if (/^>/.test(head.trimStart())) return "fasta";
  if (/^rsid\tchromosome\tposition\tallele1\tallele2/im.test(head) || /AncestryDNA/i.test(head)) return "ancestry";
  if (/23andMe/i.test(head) || /^#\s*rsid\s+chromosome\s+position\s+genotype/im.test(head)) return "23andme";
  const first = head.split(/\r?\n/).find((l) => l && !l.startsWith("#"));
  if (first) {
    const cols = first.split("\t");
    if (cols.length === 4 && /^(rs|i)\d+/.test(cols[0])) return "23andme";
    if (cols.length === 5 && /^(rs|i)\d+/.test(cols[0])) return "ancestry";
  }
  return "unknown";
}

export function parseVariantLine(line: string, format: GenomeFormat): Variant | null {
  if (!line || line.startsWith("#")) return null;
  const c = line.split("\t");
  if (format === "23andme" && c.length >= 4) {
    const chrom = normChrom(c[1]);
    const pos = Number(c[2]);
    if (!chrom || !Number.isFinite(pos)) return null;
    return { rsid: /^rs\d+$/.test(c[0]) ? c[0] : null, chrom, pos, genotype: c[3].trim() };
  }
  if (format === "ancestry" && c.length >= 5) {
    if (c[0] === "rsid") return null;
    const chrom = normChrom(c[1]);
    const pos = Number(c[2]);
    if (!chrom || !Number.isFinite(pos)) return null;
    return { rsid: /^rs\d+$/.test(c[0]) ? c[0] : null, chrom, pos, genotype: `${c[3]}${c[4]}`.trim() };
  }
  if (format === "vcf" && c.length >= 5) {
    const chrom = normChrom(c[0]);
    const pos = Number(c[1]);
    if (!chrom || !Number.isFinite(pos)) return null;
    const ids = c[2].split(";").find((x) => /^rs\d+$/.test(x)) ?? null;
    let genotype = `${c[3]}>${c[4]}`;
    if (c.length >= 10) {
      const fmt = c[8].split(":");
      const gi = fmt.indexOf("GT");
      const gt = gi >= 0 ? c[9].split(":")[gi] : "";
      const alleles = [c[3], ...c[4].split(",")];
      const called = gt.split(/[/|]/).map((i) => (i === "." ? "-" : alleles[Number(i)] ?? "?"));
      if (called.length) genotype = called.join("");
    }
    return { rsid: ids, chrom, pos, genotype };
  }
  return null;
}

export function parseFasta(text: string): FastaRecord[] {
  const out: FastaRecord[] = [];
  let cur: { name: string; length: number; gcn: number } | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(">")) {
      if (cur) out.push({ name: cur.name, length: cur.length, gc: cur.length ? cur.gcn / cur.length : 0 });
      cur = { name: line.slice(1).split(/\s/)[0] || `seq${out.length + 1}`, length: 0, gcn: 0 };
      continue;
    }
    if (!cur) cur = { name: "seq1", length: 0, gcn: 0 };
    const s = line.replace(/[^A-Za-z]/g, "");
    cur.length += s.length;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i) | 32;
      if (ch === 103 || ch === 99) cur.gcn++;
    }
  }
  if (cur) out.push({ name: cur.name, length: cur.length, gc: cur.length ? cur.gcn / cur.length : 0 });
  return out;
}

export function summarize(text: string, markerCap = 1500): GenomeSummary {
  const format = detectFormat(text);
  const summary: GenomeSummary = { format, variantCount: 0, perChrom: {}, markers: [], annotated: [], fasta: [], skipped: 0 };
  if (format === "fasta") {
    summary.fasta = parseFasta(text);
    return summary;
  }
  if (format === "unknown") return summary;
  const all: Variant[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const v = parseVariantLine(line, format);
    if (!v) {
      summary.skipped++;
      continue;
    }
    summary.variantCount++;
    summary.perChrom[v.chrom] = (summary.perChrom[v.chrom] ?? 0) + 1;
    const snp = v.rsid ? SNP_BY_RSID.get(v.rsid) : undefined;
    if (snp) summary.annotated.push({ ...v, gene: snp.gene, note: snp.note });
    all.push(v);
  }
  const stride = Math.max(1, Math.ceil(all.length / markerCap));
  for (let i = 0; i < all.length; i += stride) summary.markers.push(all[i]);
  return summary;
}

export function genomeOffset(chrom: string, pos: number): number {
  let off = 0;
  for (const c of CHROMOSOMES) {
    if (c === chrom) return off + Math.min(pos, CHROM_LENGTH_GRCH37[c]);
    off += CHROM_LENGTH_GRCH37[c];
  }
  return off;
}

export const GENOME_LENGTH = CHROMOSOMES.reduce((a, c) => a + CHROM_LENGTH_GRCH37[c], 0);
