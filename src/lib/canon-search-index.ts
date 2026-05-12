// canon-search-index.ts — server-only loader for the pre-computed
// claim-card embeddings. At runtime we keep them in memory and do
// brute-force cosine similarity (599 × 384 floats = ~920KB, fast).
//
// Query embedding happens in two places depending on environment:
//   - dev: read a JSON file of "queryword: vector" pairs (offline)
//   - prod: client-side via @xenova/transformers (Transformers.js)
//
// This module exposes a cosine-rank function the API route can call.

import fs from "fs";
import path from "path";

export type ClaimIndexEntry = {
  rowid: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  path: string;
  text: string;            // title + excerpt
  vec: Float32Array;       // 384-dim, L2-normalized
};

const REPO_ROOT = path.resolve(process.cwd());
const INDEX_DIR = path.join(REPO_ROOT, "_intake", "embeddings-v2");
const V2_VECTORS = path.join(INDEX_DIR, "claims-vectors.npy");
// fallback to v1 if v2 not present
const V1_VECTORS = path.join(REPO_ROOT, "_intake", "embeddings", "claims-vectors.f32.bin");

// We need the claim metadata + texts. Read the claim cards from disk.
const CANON_ROOT = path.join(REPO_ROOT, "bucket-canon");

let cache: ClaimIndexEntry[] | null = null;

// Minimal .npy parser for float32 arrays
function parseNpy(buf: Buffer): { shape: number[]; data: Float32Array } {
  // \x93NUMPY magic, then version, then header
  const magic = buf.slice(0, 6).toString("binary");
  if (magic !== "\x93NUMPY") throw new Error("not a numpy file");
  const major = buf[6];
  const headerLenBytes = major === 1 ? 2 : 4;
  let headerLen: number;
  if (major === 1) headerLen = buf.readUInt16LE(8);
  else headerLen = buf.readUInt32LE(8);
  const headerStart = 8 + headerLenBytes;
  const header = buf.slice(headerStart, headerStart + headerLen).toString("utf-8");
  // Parse header like: {'descr': '<f4', 'fortran_order': False, 'shape': (599, 384), }
  const shapeMatch = header.match(/'shape':\s*\(([^)]*)\)/);
  if (!shapeMatch) throw new Error("no shape in npy header");
  const shape = shapeMatch[1].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  const dataOffset = headerStart + headerLen;
  // Float32 little-endian
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

export function buildIndex(): ClaimIndexEntry[] {
  if (cache) return cache;

  // Read the claim metadata directly from disk in deterministic order
  // matching what agf-embed-claims wrote (sorted by branch, then by file).
  const entries: { branch: string; concept: string; slug: string; path: string; title: string; text: string }[] = [];

  const branches = fs.existsSync(CANON_ROOT)
    ? fs.readdirSync(CANON_ROOT).filter((d) => /^\d{2}-/.test(d)).sort()
    : [];

  for (const branch of branches) {
    const subClaims = path.join(CANON_ROOT, branch, "sub-claims");
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
          path: path.relative(REPO_ROOT, full),
          title, text,
        });
      }
    }
  }

  // Load vectors (prefer v2 if available)
  let vectors: Float32Array;
  let dim = 384;
  if (fs.existsSync(V2_VECTORS)) {
    vectors = readBinaryVectors(V2_VECTORS, dim, entries.length);
  } else if (fs.existsSync(V1_VECTORS)) {
    // v1 used nomic-embed-text which is 768-d
    dim = 768;
    vectors = readBinaryVectors(V1_VECTORS, dim, entries.length);
  } else {
    cache = [];
    return cache;
  }

  // Slice into per-entry views
  cache = entries.map((e, i) => ({
    rowid: i,
    branch: e.branch, concept: e.concept, slug: e.slug,
    title: e.title, text: e.text, path: e.path,
    vec: new Float32Array(vectors.buffer, vectors.byteOffset + i * dim * 4, dim),
  }));
  return cache;
}

export function getIndexDim(): number {
  const idx = buildIndex();
  return idx[0]?.vec.length || 384;
}

export function cosineRank(q: Float32Array, topK = 10): { entry: ClaimIndexEntry; score: number }[] {
  const idx = buildIndex();
  const scores = new Array<{ entry: ClaimIndexEntry; score: number }>(idx.length);
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i].vec;
    let s = 0;
    for (let j = 0; j < q.length; j++) s += q[j] * v[j];
    scores[i] = { entry: idx[i], score: s };
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

// Naive token-overlap fallback for when no query embedding is available
export function tokenRank(query: string, topK = 10): { entry: ClaimIndexEntry; score: number }[] {
  const idx = buildIndex();
  const qWords = Array.from(
    new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3)),
  );
  if (qWords.length === 0) return [];
  const scores = idx.map((e) => {
    const text = e.text.toLowerCase();
    let s = 0;
    for (const w of qWords) {
      const re = new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
      const m = text.match(re);
      if (m) s += m.length;
    }
    return { entry: e, score: s };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}
