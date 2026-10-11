import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const OUT = path.join(ROOT, "src/data/research-maps");

export function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

export const corpus = () => flag("source", path.join(os.homedir(), "agfarms/.learning-corpus"));

export const readJsonl = (file) =>
  fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

export const num = (cell) => Number(String(cell).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0] ?? 0);

export function firstDate(text) {
  const hit = text.match(/\d{4}-\d{2}-\d{2}/);
  if (!hit) throw new Error("no date in source");
  return hit[0];
}

export function tableAfter(markdown, marker) {
  const start = markdown.indexOf(marker);
  if (start < 0) throw new Error(`no table marker ${marker}`);
  const rows = [];
  for (const line of markdown.slice(start).split("\n").slice(1)) {
    if (line.startsWith("|")) rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
    else if (rows.length) break;
  }
  return rows.slice(1);
}

export function sourceInfo(file, label) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  const chunk = Buffer.alloc(1 << 20);
  for (let read = fs.readSync(fd, chunk, 0, chunk.length, null); read > 0; read = fs.readSync(fd, chunk, 0, chunk.length, null)) hash.update(chunk.subarray(0, read));
  fs.closeSync(fd);
  return { file: label, sha256: hash.digest("hex"), date: fs.statSync(file).mtime.toISOString().slice(0, 10) };
}

export function write(name, value) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, JSON.stringify(value) + "\n");
  console.log(name, fs.statSync(file).size, "bytes");
}

export function expect(label, got, want) {
  if (got !== want) throw new Error(`${label}: computed ${got}, source states ${want}`);
}
