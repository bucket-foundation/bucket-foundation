import type { Hit } from "../search";
import { CHROMOSOMES, CHROM_LENGTH_GRCH37, GENOME_LENGTH, SNPS, genomeOffset, type Annotated, type GenomeSummary } from "../genome/parse";
import { hitColor } from "./globe";
import { helixFrame, helixPoint } from "./helix";
import type { ExploreMode, Guide, SceneLink, SceneNode, Vec3 } from "./types";

export const DNA_SLOTS = 120;
export const BAND_A = "#C9B27A";
export const BAND_B = "#6E8A7E";
export const MARKER_COLOR = "#8FA3B8";
export const ANNOTATED_COLOR = "#E0A33A";
export const REFERENCE_COLOR = "#5E574A";

export function slotOf(chrom: string, pos: number): number {
  return (genomeOffset(chrom, pos) / GENOME_LENGTH) * (DNA_SLOTS - 1);
}

export function genesCited(h: Hit, genes: string[]): string[] {
  const hay = `${h.title} ${h.text}`;
  return genes.filter((g) => new RegExp(`(^|[^A-Za-z0-9])${g}([^A-Za-z0-9]|$)`).test(hay));
}

function chromBands(frame: ReturnType<typeof helixFrame>): Guide[] {
  const out: Guide[] = [];
  CHROMOSOMES.forEach((c, i) => {
    const a = slotOf(c, 0);
    const b = slotOf(c, CHROM_LENGTH_GRCH37[c]);
    const pts: Vec3[] = [];
    const steps = Math.max(2, Math.ceil((b - a) * 4));
    for (let k = 0; k <= steps; k++) pts.push(helixPoint(a + ((b - a) * k) / steps, DNA_SLOTS, 0, frame));
    out.push({ kind: "tube", points: pts, color: i % 2 ? BAND_B : BAND_A, radius: 0.02 });
    const mid = helixPoint((a + b) / 2, DNA_SLOTS, 0, frame, 1.15);
    out.push({ kind: "text", position: mid, text: `chr${c}`, color: "#B8AE94", size: 9 });
  });
  const back: Vec3[] = [];
  for (let s = 0; s <= (DNA_SLOTS - 1) * 2; s++) back.push(helixPoint(s / 2, DNA_SLOTS, 1, frame));
  out.push({ kind: "tube", points: back, color: "#3E4A52", radius: 0.01 });
  return out;
}

export function dnaLayout(hits: Hit[], genome: GenomeSummary | null | undefined, scroll: number) {
  const frame = helixFrame(scroll);
  const nodes: SceneNode[] = [];
  const links: SceneLink[] = [];
  const annotated: (Annotated | (typeof SNPS)[number])[] = genome?.annotated.length ? genome.annotated : SNPS;
  const genes = Array.from(new Set(annotated.map((a) => a.gene)));

  if (genome) {
    for (const m of genome.markers) {
      const slot = slotOf(m.chrom, m.pos);
      nodes.push({ id: `marker:${m.chrom}:${m.pos}`, position: helixPoint(slot, DNA_SLOTS, 1, frame), color: MARKER_COLOR, size: 0.012, label: `${m.rsid ?? "marker"} chr${m.chrom}:${m.pos} ${m.genotype}` });
    }
  }
  const seen = new Set<string>();
  for (const a of annotated) {
    const id = `snp:${a.rsid}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const slot = slotOf(a.chrom, a.pos);
    const genotype = "genotype" in a ? ` ${a.genotype}` : "";
    nodes.push({ id, position: helixPoint(slot, DNA_SLOTS, 0, frame, 0.92), color: genome ? ANNOTATED_COLOR : REFERENCE_COLOR, size: 0.045, label: `${a.gene} ${a.rsid}${genotype} · ${a.note}` });
  }
  const bySnpGene = new Map<string, string[]>();
  for (const a of annotated) bySnpGene.set(a.gene, [...(bySnpGene.get(a.gene) ?? []), `snp:${a.rsid}`]);
  const placed = new Set<string>();
  for (const h of hits) {
    const cited = genesCited(h, genes);
    if (!cited.length || placed.has(h.id)) continue;
    placed.add(h.id);
    const target = bySnpGene.get(cited[0])![0];
    const t = nodes.find((n) => n.id === target)!;
    const [x, y, z] = t.position;
    const r = Math.hypot(x, z) || 1;
    nodes.push({ id: h.id, position: [(x / r) * 1.6, y + 0.08 * placed.size, (z / r) * 1.6], color: hitColor(h), size: 0.035, label: h.title });
    for (const g of cited) for (const sid of bySnpGene.get(g) ?? []) links.push({ from: h.id, to: sid, color: ANNOTATED_COLOR });
  }
  return { nodes, links, guides: chromBands(frame) };
}

export const dnaMode: ExploreMode = {
  id: "dna",
  label: "DNA",
  layout(hits, ctx) {
    const { nodes, links, guides } = dnaLayout([...(ctx.extraHits ?? []), ...hits], ctx.genome, ctx.scroll);
    return {
      nodes,
      links,
      guides,
      legend: [
        { label: "chromosome bands", color: BAND_A },
        { label: ctx.genome ? "annotated SNP in your file" : "annotated SNP, reference", color: ctx.genome ? ANNOTATED_COLOR : REFERENCE_COLOR },
        { label: "marker", color: MARKER_COLOR },
        { label: "canon excerpt citing the gene", color: "#8E3E3E" },
      ],
      camera: [0, 0, 6],
      wheel: "scroll",
    };
  },
};
