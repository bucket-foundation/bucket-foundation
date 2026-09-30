import type { Hit } from "./search";
import catalog from "./fixtures/proteins.json";
import { SNPS } from "./genome/parse";

export interface ResidueLink {
  chain: string;
  resi: number;
  rsid: string;
  note: string;
}

export interface ProteinEntry {
  id: string;
  name: string;
  gene: string;
  pdb: string;
  file: string;
  residues: ResidueLink[];
}

export type StructureFormat = "pdb" | "cif";

export interface StructureSummary {
  format: StructureFormat;
  chains: string[];
  residues: number;
}

export const PROTEINS = catalog.proteins as ProteinEntry[];

export function proteinById(id: string | null | undefined): ProteinEntry {
  return PROTEINS.find((p) => p.id === id) ?? PROTEINS[0];
}

export function formatOf(fileName: string): StructureFormat {
  return /\.(cif|mmcif)$/i.test(fileName) ? "cif" : "pdb";
}

export function summarize(text: string, format: StructureFormat): StructureSummary {
  const chains = new Set<string>();
  const seen = new Set<string>();
  if (format === "pdb") {
    for (const line of text.split("\n")) {
      if (!line.startsWith("ATOM") || line.slice(12, 16).trim() !== "CA") continue;
      const chain = line.slice(21, 22).trim() || "A";
      chains.add(chain);
      seen.add(`${chain}:${line.slice(22, 27).trim()}`);
    }
  } else {
    const cols: string[] = [];
    let inLoop = false;
    for (const line of text.split("\n")) {
      if (line.startsWith("_atom_site.")) {
        cols.push(line.trim());
        inLoop = true;
        continue;
      }
      if (!inLoop || !line.startsWith("ATOM")) continue;
      const f = line.trim().split(/\s+/);
      const atom = f[cols.indexOf("_atom_site.label_atom_id")];
      if (atom !== "CA") continue;
      const chain = f[cols.indexOf("_atom_site.auth_asym_id")] ?? "A";
      chains.add(chain);
      seen.add(`${chain}:${f[cols.indexOf("_atom_site.auth_seq_id")]}`);
    }
  }
  return { format, chains: Array.from(chains), residues: seen.size };
}

export function residueName(text: string, chain: string, resi: number): string | null {
  for (const line of text.split("\n")) {
    if (!line.startsWith("ATOM") || line.slice(12, 16).trim() !== "CA") continue;
    if ((line.slice(21, 22).trim() || "A") === chain && Number(line.slice(22, 26)) === resi) return line.slice(17, 20).trim();
  }
  return null;
}

export function snpFor(link: ResidueLink) {
  return SNPS.find((s) => s.rsid === link.rsid) ?? null;
}

export function proteinHits(p: ProteinEntry, hits: Hit[]): Hit[] {
  const re = new RegExp(`(^|[^A-Za-z0-9])${p.gene}([^A-Za-z0-9]|$)`);
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.id) || !(re.test(`${h.title} ${h.text}`) || h.branch.includes("biophysics"))) return false;
    seen.add(h.id);
    return true;
  });
}
