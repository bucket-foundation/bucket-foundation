const { createHash } = require("node:crypto");
const { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } = require("node:fs");
const { basename, dirname, join } = require("node:path");

const LEARNING = join(__dirname, "../../learning/app");
const OUT = join(__dirname, "../public/academy-app");

const COPIES = [
  { from: "corpus", to: "corpus", only: /^lang-.*\.json$/ },
  { from: "polingual/top1000", to: "polingual/top1000" },
  { from: "audio", to: "audio" },
];

const VERSIONED = ["corpus", "polingual/top1000"];
const VERSIONED_FILES = ["audio/index.json"];

function files(dir) {
  return readdirSync(dir).sort().flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

function syncCorpus(src = LEARNING, dest = OUT) {
  for (const { from, to, only } of COPIES) {
    const s = join(src, from);
    if (!existsSync(s)) throw new Error(`missing ${s}`);
    const d = join(dest, to);
    rmSync(d, { recursive: true, force: true });
    mkdirSync(dirname(d), { recursive: true });
    cpSync(s, d, { recursive: true, filter: (p) => !only || statSync(p).isDirectory() || only.test(basename(p)) });
  }
  const h = createHash("sha256");
  for (const v of VERSIONED) for (const f of files(join(dest, v))) h.update(f.slice(dest.length)).update(readFileSync(f));
  for (const v of VERSIONED_FILES) {
    const f = join(dest, v);
    if (existsSync(f)) h.update(f.slice(dest.length)).update(readFileSync(f));
  }
  return h.digest("hex").slice(0, 12);
}

module.exports = { COPIES, VERSIONED, VERSIONED_FILES, syncCorpus };

if (require.main === module) console.log(syncCorpus());
