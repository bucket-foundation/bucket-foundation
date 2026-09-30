import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const REMOTE = "gdrive:AGFarms/Nucleus/research/bucket-canon/";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LOCAL = path.join(ROOT, ".local", "canon-drive");
const OUT = path.join(ROOT, "src", "lib", "explore", "fixtures", "canon-drive.json");
const READ_ONLY = ["--drive-scope", "drive.readonly"];
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

function rclone(args) {
  return execFileSync("rclone", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

export function scrub(s) {
  return s.normalize("NFKC").replace(EMAIL, "").replace(/\s+/g, " ").trim();
}

export function branchOf(filePath) {
  const top = filePath.split("/")[0];
  return /^\d\d-/.test(top) ? top : "canon";
}

export function titleOf(filePath, text) {
  const heading = text.split("\n").find((l) => l.startsWith("# "));
  const fallback = path.basename(filePath, ".md");
  return scrub(heading ? heading.replace(/^#\s+/, "").replace(/\*+/g, "") : fallback) || fallback;
}

export function buildIndex(listing, readText) {
  return listing
    .filter((f) => !f.IsDir && f.Path.toLowerCase().endsWith(".md"))
    .map((f) => ({
      title: titleOf(f.Path, readText(f.Path)),
      branch: branchOf(f.Path),
      path: f.Path,
      size: f.Size,
    }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
}

function main() {
  mkdirSync(LOCAL, { recursive: true });
  rclone(["copy", REMOTE, LOCAL, "--include", "*.md", ...READ_ONLY]);
  const listing = JSON.parse(rclone(["lsjson", REMOTE, "-R", "--files-only", "--no-mimetype", ...READ_ONLY]));
  const files = buildIndex(listing, (p) => {
    const f = path.join(LOCAL, p);
    return existsSync(f) ? readFileSync(f, "utf8") : "";
  });
  writeFileSync(OUT, JSON.stringify({ source: REMOTE, files }));
  console.log(`canon-drive: ${files.length} files`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
