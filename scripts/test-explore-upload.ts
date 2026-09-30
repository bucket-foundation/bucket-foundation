import fs from "fs";
import zlib from "zlib";
import { bibHits, classify, linkNearest, looksLikeSmiles, parseBibtex, parseRis, pdfText, processUpload, routeFor, youHit } from "../src/lib/explore/upload";
import { MOLECULES, REACTIONS, moleculeById, registerCustom, reactionById } from "../src/lib/explore/modes/chem";
import { hitColor } from "../src/lib/explore/modes/globe";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}
const enc = (s: string) => new TextEncoder().encode(s);

async function main() {
  const sample = fs.readFileSync("public/explore/sample-genome.txt", "utf8");
  check("23andMe txt classifies as genome", classify("genome.txt", sample).kind === "genome");
  check("VCF classifies as genome", classify("a.vcf", "##fileformat=VCFv4.2\n#CHROM\tPOS\n").kind === "genome");
  check("FASTA classifies as genome", classify("a.fa", ">seq1\nACGT\n").kind === "genome");
  const pdb = fs.readFileSync("public/explore/fixtures/apoe3-nterm.pdb", "utf8");
  check("PDB classifies as structure", classify("x.pdb", pdb).kind === "structure" && classify("noext", pdb).format === "pdb");
  check("mmCIF classifies as structure", classify("x.cif", "data_1ABC\nloop_\n_atom_site.group_PDB\n").format === "cif");
  check("SMILES file classifies as smiles", classify("m.smi", "CC(=O)Oc1ccccc1C(=O)O aspirin\n").kind === "smiles");
  check("bare SMILES text classifies as smiles", classify("paste.txt", "CCO\n").kind === "smiles");
  check("prose is not SMILES", !looksLikeSmiles("hello") && !looksLikeSmiles("two words") && !looksLikeSmiles("C(C"));
  check("reaction SMILES is valid", looksLikeSmiles("CC(=O)O.OCC>>CC(=O)OCC.O"));
  check("BibTeX classifies as bibliography", classify("r.bib", "@article{a, title={T}}").kind === "bibliography");
  check("RIS classifies as bibliography", classify("r.ris", "TY  - JOUR\nTI  - T\nER  - \n").format === "ris");
  check("CSL JSON classifies as bibliography", classify("r.json", '[{"title":"A","author":[{"family":"X"}]}]').format === "csl-json");
  check("CSV with title column is bibliography", classify("r.csv", "title,year\nA,2001\n").kind === "bibliography");
  check("CSV with smiles column is smiles", classify("r.csv", "name,smiles\nx,CCO\n").kind === "smiles");
  check("CSV without known columns is unknown", classify("r.csv", "a,b\n1,2\n").kind === "unknown");
  check("Markdown classifies as document", classify("cv.md", "# CV\nI study light.").kind === "document");
  check("PDF classifies as document", classify("cv.pdf", "%PDF-1.4").format === "pdf");

  const bib = parseBibtex("@article{k1, title={{Light} and water}, author={Pollack, Gerald and Kruse, Jack}, year=2013}\n@book{k2, title=\"Cells\", year={1999}}");
  check("BibTeX entries parse", bib.length === 2 && bib[0].title === "Light and water" && bib[0].year === 2013 && bib[0].authors.includes("Kruse"));
  const ris = parseRis("TY  - JOUR\nTI  - Coherence\nAU  - Fröhlich, H\nPY  - 1968///\nER  - \nTY  - BOOK\nT1  - Second\nER  - \n");
  check("RIS entries parse", ris.length === 2 && ris[0].year === 1968 && ris[1].title === "Second");

  const g = await processUpload("g.txt", enc(sample));
  check("genome upload routes to DNA", g.kind === "genome" && routeFor(g).mode === "dna" && g.summary.variantCount > 0);
  const st = await processUpload("apoe.pdb", enc(pdb));
  check("structure upload routes to protein", st.kind === "structure" && routeFor(st).mode === "protein" && st.summary.residues > 0);
  const sm = await processUpload("a.smi", enc("CC(=O)O.OCC>>CC(=O)OCC.O\n"));
  check("reaction SMILES routes to reaction mode", sm.kind === "smiles" && routeFor(sm).mode === "reaction");
  const mol = await processUpload("a.smi", enc("CCO\nCCN\n"));
  check("SMILES list routes to molecule mode", mol.kind === "smiles" && mol.count === 2 && routeFor(mol).mode === "molecule");
  const b = await processUpload("r.bib", enc("@article{k1, title={Light}, year=2013}"));
  check("bibliography upload adds papers without a mode switch", b.kind === "bibliography" && routeFor(b).mode === null);
  const bad = await processUpload("x.bin", new Uint8Array([0, 1, 2, 255, 254, 0, 9]));
  check("binary junk is rejected with a reason", bad.kind === "unknown" && routeFor(bad).label.length > 0);
  const empty = await processUpload("e.txt", enc("   "));
  check("empty text is rejected", empty.kind === "unknown");

  const content = "BT /F1 12 Tf (Light and water in cells) Tj ET BT [(Mito) -300 (chondria)] TJ ET";
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\n"), zlib.deflateSync(Buffer.from(content)), Buffer.from("\nendstream\nendobj\n")]);
  const txt = await pdfText(new Uint8Array(pdf));
  check("PDF text is extracted from a flate stream", txt.includes("Light and water in cells") && txt.includes("Mito chondria"), txt);
  const pdfr = await processUpload("cv.pdf", new Uint8Array(pdf));
  check("PDF upload becomes a document", pdfr.kind === "document" && routeFor(pdfr).mode === null);
  const bomb = Buffer.concat([Buffer.from("%PDF-1.4\n<< /Filter /FlateDecode >>\nstream\n"), zlib.deflateSync(Buffer.alloc(2_000_000, "BT (x) Tj ET ")), Buffer.from("\nendstream\n")]);
  check("oversized flate output is dropped at the cap", (await pdfText(new Uint8Array(bomb), 100_000)) === "");
  check("same stream reads under a higher cap", (await pdfText(new Uint8Array(bomb))).length > 0);
  const noText = await processUpload("s.pdf", enc("%PDF-1.4\nstream\nabc\nendstream"));
  check("PDF without text is rejected", noText.kind === "unknown");

  const you = youHit("cv.md", "I study light and water in mitochondria");
  check("self node is a you hit with a gold color", you.type === "you" && you.id === "you:self" && hitColor(you) === "#F2C14E");
  const pool = [
    { id: "excerpt:a", type: "excerpt" as const, title: "Light water", subtitle: "", text: "light water mitochondria", score: 1, branch: "05-biophysics", year: null, url: null, links: [] },
    { id: "advisor:1", type: "advisor" as const, title: "Other", subtitle: "", text: "topology", score: 1, branch: "x", year: null, url: null, links: [] },
  ];
  const linked = linkNearest([you, ...bibHits([{ title: "Water in cells", authors: "A", year: 2000 }])], pool);
  check("uploaded nodes link to the nearest excerpt only", linked.every((h) => h.links.length === 1 && h.links[0] === "excerpt:a"));
  check("bibliography hits are paper hits with upload ids", bibHits([{ title: "T", authors: "", year: null }])[0].id === "paper:upload/0");

  const id1 = registerCustom(MOLECULES, { name: "u1", smiles: "CCO" });
  const id2 = registerCustom(MOLECULES, { name: "u2", smiles: "CCN" });
  check("custom molecule replaces the previous upload with a fresh id", id1 !== id2 && moleculeById(id2).smiles === "CCN" && MOLECULES.filter((m) => m.id.startsWith("upload-")).length === 1);
  const rid = registerCustom(REACTIONS, { name: "r", smiles: "A>>B" });
  check("custom reaction resolves by id", reactionById(rid).smiles === "A>>B");

  if (failed) {
    console.error(`${failed} failed`);
    process.exit(1);
  }
  console.log("all passed");
}
main();
