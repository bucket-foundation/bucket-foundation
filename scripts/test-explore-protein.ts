import { readFileSync } from "node:fs";
import { PROTEINS, formatOf, proteinById, proteinHits, residueName, snpFor, summarize } from "../src/lib/explore/protein";
import { proteinMode } from "../src/lib/explore/modes/protein";
import { MODES } from "../src/lib/explore/modes";
import { SNPS } from "../src/lib/explore/genome/parse";
import { SAMPLE_HITS } from "./lib/explore-hits";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const p = proteinById("apoe3");
const text = readFileSync(`public${p.file}`, "utf8");
const s = summarize(text, "pdb");
check("fixture parses to one chain", s.chains.join() === "A", s.chains.join());
check("fixture has 100 to 200 residues", s.residues > 100 && s.residues < 200, String(s.residues));
check("residue 112 is Cys and 158 is Arg in E3", residueName(text, "A", 112) === "CYS" && residueName(text, "A", 158) === "ARG");
check("every linked residue exists in the file", p.residues.every((r) => residueName(text, r.chain, r.resi) !== null));
check("every residue link resolves to a DNA mode SNP on the same gene", PROTEINS.every((x) => x.residues.every((r) => snpFor(r)?.gene === x.gene)));
check("linked rsIDs are in the DNA reference list", p.residues.every((r) => SNPS.some((n) => n.rsid === r.rsid)));
check("file extension picks the format", formatOf("AF-P02649.cif") === "cif" && formatOf("x.pdb") === "pdb" && formatOf("x.ent") === "pdb");
const cif = ["loop_", "_atom_site.group_PDB", "_atom_site.label_atom_id", "_atom_site.auth_asym_id", "_atom_site.auth_seq_id", "ATOM N A 1", "ATOM CA A 1", "ATOM CA A 2"].join("\n");
check("mmCIF residues are counted by CA", summarize(cif, "cif").residues === 2);
const gene = { ...SAMPLE_HITS[1], id: "excerpt:x", title: "APOE and light", text: "", branch: "01-mathematics" };
check("hits citing the gene or in biophysics attach", proteinHits(p, [gene, ...SAMPLE_HITS]).map((h) => h.id).sort().join() === ["advisor:1", "excerpt:05-biophysics/light/b", "excerpt:x"].sort().join());
check("protein mode uses the protein renderer", proteinMode.renderer === "protein" && MODES.some((m) => m.id === "protein"));

if (failed) process.exit(1);
