import fs from "fs";
import path from "path";
import { CANON_DEFAULT_DIM, type ClaimIndexEntry } from "./canon-rank";

const REPO_ROOT = path.resolve(process.cwd());
const INDEX_DIR = path.join(REPO_ROOT, "_intake", "embeddings-v2");
const V2_VECTORS = path.join(INDEX_DIR, "claims-vectors.npy");
const V1_VECTORS = path.join(REPO_ROOT, "_intake", "embeddings", "claims-vectors.f32.bin");

let cache: ClaimIndexEntry[] | null = null;

function parseNpy(buf: Buffer): { shape: number[]; data: Float32Array } {
  const magic = buf.slice(0, 6).toString("binary");
  if (magic !== "\x93NUMPY") throw new Error("not a numpy file");
  const major = buf[6];
  const headerLenBytes = major === 1 ? 2 : 4;
  let headerLen: number;
  if (major === 1) headerLen = buf.readUInt16LE(8);
  else headerLen = buf.readUInt32LE(8);
  const headerStart = 8 + headerLenBytes;
  const header = buf.slice(headerStart, headerStart + headerLen).toString("utf-8");
  const shapeMatch = header.match(/'shape':\s*\(([^)]*)\)/);
  if (!shapeMatch) throw new Error("no shape in npy header");
  const shape = shapeMatch[1].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  const dataOffset = headerStart + headerLen;
  const numEl = shape.reduce((a, b) => a * b, 1);
  const data = new Float32Array(buf.buffer, buf.byteOffset + dataOffset, numEl);
  return { shape, data };
}

function readBinaryVectors(p: string, dim: number, n: number): Float32Array {
  const buf = fs.readFileSync(p);
  if (p.endsWith(".npy")) {
    const { data } = parseNpy(buf);
    return data;
  }
  return new Float32Array(buf.buffer, buf.byteOffset, n * dim);
}

function parseExcerpt(file: string): { title: string; excerpt: string } {
  let raw = "";
  try { raw = fs.readFileSync(file, "utf-8"); } catch { return { title: "", excerpt: "" }; }
  const lines = raw.split("\n");
  const title = (lines.find((l) => l.startsWith("# ")) || "").replace(/^#\s+/, "").trim();
  const m = raw.match(/## Excerpt\s*\n([\s\S]+?)(?=\n## |$)/);
  let excerpt = m ? m[1].trim() : "";
  excerpt = excerpt.replace(/^>\s*/gm, "").trim();
  return { title, excerpt };
}

export type CanonClaim = { branch: string; concept: string; slug: string; path: string; title: string; text: string };

export function readCanonClaims(repoRoot: string): CanonClaim[] {
  const canonRoot = path.join(repoRoot, "bucket-canon");
  const entries: CanonClaim[] = [];

  const branches = fs.existsSync(canonRoot)
    ? fs.readdirSync(canonRoot).filter((d) => /^\d{2}-/.test(d)).sort()
    : [];

  for (const branch of branches) {
    const subClaims = path.join(canonRoot, branch, "sub-claims");
    if (!fs.existsSync(subClaims)) continue;
    for (const concept of fs.readdirSync(subClaims).sort()) {
      const conceptDir = path.join(subClaims, concept);
      if (!fs.statSync(conceptDir).isDirectory()) continue;
      for (const file of fs.readdirSync(conceptDir).sort()) {
        if (!file.endsWith(".md") || file === "INDEX.md") continue;
        const slug = file.replace(/\.md$/, "");
        const full = path.join(conceptDir, file);
        const { title, excerpt } = parseExcerpt(full);
        if (excerpt.length < 40) continue;
        const text = `${title}. ${excerpt}`;
        entries.push({
          branch, concept, slug,
          path: path.relative(repoRoot, full),
          title, text,
        });
      }
    }
  }
  return entries;
}

export function loadCanonIndex(): ClaimIndexEntry[] {
  if (cache) return cache;

  const entries = readCanonClaims(REPO_ROOT);

  let vectors: Float32Array;
  let dim = CANON_DEFAULT_DIM;
  if (fs.existsSync(V2_VECTORS)) {
    vectors = readBinaryVectors(V2_VECTORS, dim, entries.length);
  } else if (fs.existsSync(V1_VECTORS)) {
    dim = 768;
    vectors = readBinaryVectors(V1_VECTORS, dim, entries.length);
  } else {
    cache = [];
    return cache;
  }

  cache = entries.map((e, i) => ({
    rowid: i,
    branch: e.branch, concept: e.concept, slug: e.slug,
    title: e.title, text: e.text, path: e.path,
    vec: new Float32Array(vectors.buffer, vectors.byteOffset + i * dim * 4, dim),
  }));
  return cache;
}
