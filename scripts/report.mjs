#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { canonicalBytes, checkHashes, publicPaths, sha256, upsertPapersSource, validateRecord, webpName } from "./lib/report-record.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORTS = join(ROOT, "reports");
const PAPERS_TS = join(ROOT, "src", "lib", "papers.ts");

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function recordPath(slug) {
  return join(REPORTS, slug, "report.json");
}

function readRecord(slug) {
  const path = recordPath(slug);
  if (!existsSync(path)) throw new Error(`${slug}: ${path} not found`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeRecord(record) {
  const errors = validateRecord(record);
  if (errors.length) throw new Error(`${record.slug}: ${errors.join("; ")}`);
  writeFileSync(recordPath(record.slug), canonicalBytes(record));
}

function readRepoBytes(path) {
  const full = join(ROOT, path);
  return existsSync(full) ? readFileSync(full) : null;
}

function slugs() {
  if (!existsSync(REPORTS)) return [];
  return readdirSync(REPORTS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(REPORTS, d.name, "report.json")))
    .map((d) => d.name)
    .sort();
}

function run(command, cwd) {
  execFileSync("bash", ["-lc", command], { cwd, stdio: "inherit" });
}

function outputDir(slug) {
  return join(ROOT, "output", "reports", slug);
}

async function toWebp(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const sharp = (await import("sharp")).default;
  let input = src;
  if (src.endsWith(".pdf")) {
    const png = dest.replace(/\.webp$/, "");
    run(`pdftoppm -png -r 160 -singlefile "${src}" "${png}"`, ROOT);
    input = `${png}.png`;
  }
  await sharp(input, { density: 220 }).webp({ quality: 88 }).toFile(dest);
  if (input !== src) run(`rm -f "${input}"`, ROOT);
}

async function build(slug) {
  const record = readRecord(slug);
  const sourceDir = join(ROOT, dirname(record.source_path));
  const out = outputDir(slug);
  mkdirSync(out, { recursive: true });
  const outPdf = join(out, "paper.pdf");
  if (record.build_command) {
    run(record.build_command, sourceDir);
    if (!record.pdf_path) throw new Error(`${slug}: build_command needs pdf_path to say where the PDF lands`);
    copyFileSync(join(ROOT, record.pdf_path), outPdf);
  } else if (record.source_path.endsWith(".tex")) {
    run("make pdf", sourceDir);
    copyFileSync(join(sourceDir, "main.pdf"), outPdf);
  } else if (record.source_path.endsWith(".md")) {
    run(`pandoc "${join(ROOT, record.source_path)}" --from gfm --pdf-engine=pdflatex -V geometry:margin=1in -V colorlinks=true --resource-path="${sourceDir}" -o "${outPdf}"`, sourceDir);
  } else {
    throw new Error(`${slug}: no builder for ${record.source_path}`);
  }
  for (const fig of record.figures ?? []) await toWebp(join(ROOT, fig.path), join(out, "figures", webpName(fig.path)));
  for (const src of record.data_sources ?? []) {
    if (!src.path) continue;
    mkdirSync(join(out, "data"), { recursive: true });
    copyFileSync(join(ROOT, src.path), join(out, "data", src.path.split("/").pop()));
  }
  const pdfPath = record.pdf_path ?? `output/reports/${slug}/paper.pdf`;
  if (record.pdf_path && resolve(ROOT, record.pdf_path) !== outPdf) copyFileSync(outPdf, join(ROOT, record.pdf_path));
  record.pdf_path = pdfPath;
  record.pdf_hash = sha256(readFileSync(join(ROOT, pdfPath)));
  record.source_hash = sha256(readFileSync(join(ROOT, record.source_path)));
  record.built_at = now();
  record.updated_at = record.built_at;
  writeRecord(record);
  console.log(`${slug}: built ${pdfPath}`);
}

function env() {
  const path = join(ROOT, ".env.local");
  const fallback = join(ROOT, "..", "bucket-foundation", ".env.local");
  const text = readFileSync(existsSync(path) ? path : fallback, "utf8");
  const vars = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return vars;
}

async function register(slug) {
  const record = readRecord(slug);
  const errors = [...validateRecord(record), ...checkHashes(record, readRepoBytes)];
  if (errors.length) throw new Error(`${slug}: ${errors.join("; ")}`);
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env();
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  const row = {
    slug: record.slug,
    title: record.title,
    authors: record.authors,
    date: record.date,
    status: record.status,
    kind: record.kind,
    abstract: record.abstract ?? (record.abstract_paragraphs ?? []).join("\n\n"),
    bead: record.bead ?? null,
    source_path: record.source_path,
    pdf_path: record.pdf_path ?? null,
    figures: record.figures ?? [],
    data_sources: record.data_sources ?? [],
    source_hash: record.source_hash,
    pdf_hash: record.pdf_hash ?? null,
    built_at: record.built_at ?? null,
    published_at: record.published_at ?? null,
    updated_at: now(),
  };
  const res = await fetch(`${url}/rest/v1/reports?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Content-Profile": "graph",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`${slug}: register failed ${res.status} ${await res.text()}`);
  console.log(`${slug}: registered (${record.status})`);
}

async function publish(slug) {
  const record = readRecord(slug);
  const errors = validateRecord({ ...record, status: "public", published_at: record.published_at ?? now(), pdf_path: record.pdf_path ?? "x" });
  if (errors.length) throw new Error(`${slug}: ${errors.join("; ")}`);
  if (!record.pdf_path) throw new Error(`${slug}: build first`);
  const paths = publicPaths(record);
  mkdirSync(join(ROOT, paths.base), { recursive: true });
  copyFileSync(join(ROOT, record.pdf_path), join(ROOT, paths.pdf));
  for (const [i, fig] of (record.figures ?? []).entries()) {
    const built = join(outputDir(slug), "figures", webpName(fig.path));
    if (!existsSync(built)) await toWebp(join(ROOT, fig.path), built);
    copyFileSync(built, join(ROOT, paths.figures[i]));
  }
  const dataSources = (record.data_sources ?? []).filter((src) => src.path);
  if (dataSources.length) mkdirSync(join(ROOT, paths.base, "data"), { recursive: true });
  dataSources.forEach((src, i) => copyFileSync(join(ROOT, src.path), join(ROOT, paths.data[i])));
  record.status = "public";
  record.published_at = record.published_at ?? now();
  record.updated_at = now();
  writeRecord(record);
  writeFileSync(PAPERS_TS, upsertPapersSource(readFileSync(PAPERS_TS, "utf8"), record));
  console.log(`${slug}: public at /research/papers/${slug}`);
}

function list() {
  const rows = slugs().map((slug) => {
    const r = readRecord(slug);
    return [slug, r.status, r.kind, r.date, r.source_path];
  });
  const widths = [0, 0, 0, 0].map((_, c) => Math.max(...rows.map((r) => r[c].length), 4));
  for (const r of rows) console.log(r.map((cell, c) => (c < 4 ? cell.padEnd(widths[c]) : cell)).join("  "));
}

function check() {
  let failed = 0;
  for (const slug of slugs()) {
    const record = JSON.parse(readFileSync(recordPath(slug), "utf8"));
    const errors = validateRecord(record);
    if (!errors.length) {
      if (record.slug !== slug) errors.push(`slug: ${record.slug} does not match folder ${slug}`);
      errors.push(...checkHashes(record, readRepoBytes));
      if (!readFileSync(recordPath(slug)).equals(canonicalBytes(record))) errors.push("report.json: not in canonical byte form");
      if (record.status === "public") {
        const paths = publicPaths(record);
        for (const p of [paths.pdf, ...paths.figures, ...paths.data]) if (!existsSync(join(ROOT, p))) errors.push(`public copy missing: ${p}`);
        if (!readFileSync(PAPERS_TS, "utf8").includes(`slug: ${JSON.stringify(slug)},`)) errors.push("src/lib/papers.ts: no entry");
      }
    }
    if (errors.length) {
      failed += 1;
      console.log(`FAIL ${slug}\n  ${errors.join("\n  ")}`);
    } else console.log(`ok   ${slug}`);
  }
  if (failed) process.exit(1);
}

const [command, slug] = process.argv.slice(2);
const needsSlug = ["build", "register", "publish"];
if (!command || (needsSlug.includes(command) && !slug)) {
  console.error("usage: scripts/report.mjs build|register|publish <slug> | list | check");
  process.exit(2);
}
try {
  if (command === "build") await build(slug);
  else if (command === "register") await register(slug);
  else if (command === "publish") await publish(slug);
  else if (command === "list") list();
  else if (command === "check") check();
  else throw new Error(`unknown command ${command}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
