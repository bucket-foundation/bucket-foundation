import fs from "fs";
import path from "path";
import { parseExcerpt, readCanonClaims } from "../src/lib/canon-index-loader";
import { parseTalk } from "../src/lib/explore/talks";
import { matchStart, startFromUrl, type Cue, type YtStarts } from "../src/lib/explore/yt-start";
import type { SourceIndex } from "../src/lib/explore/source-index";

const ROOT = path.resolve(__dirname, "..");
const argYt = process.argv.indexOf("--yt");
const YT = argYt > 0 ? path.resolve(process.argv[argYt + 1]) : path.join(ROOT, "yt");
const OUT = path.join(ROOT, "src", "data", "yt-starts.json");

const folders = new Map<string, string>();
for (const d of fs.existsSync(YT) ? fs.readdirSync(YT) : []) if (d.length > 12 && d[11] === "-") folders.set(d.slice(0, 11), d);

const cueCache = new Map<string, Cue[] | null>();
function cues(id: string): Cue[] | null {
  if (cueCache.has(id)) return cueCache.get(id)!;
  let out: Cue[] | null = null;
  const dir = folders.get(id);
  if (dir) {
    try {
      out = JSON.parse(fs.readFileSync(path.join(YT, dir, "transcript.json"), "utf8")) as Cue[];
    } catch {
      out = null;
    }
  }
  cueCache.set(id, out);
  return out;
}

const starts: YtStarts = { v: 1, excerpts: {}, sources: {} };
let matched = 0;
let fallback = 0;
for (const claim of readCanonClaims(ROOT)) {
  const head = fs.readFileSync(path.join(ROOT, claim.path), "utf8").slice(0, 2000);
  const talk = parseTalk(head);
  if (!talk) continue;
  const c = cues(talk.id);
  const found = c ? matchStart(parseExcerpt(path.join(ROOT, claim.path)).excerpt, c) : null;
  const hint = startFromUrl(/\*\*Source\*\*:\s*\[.+\]\((\S+)\)/.exec(head)?.[1] ?? "");
  const start = found ?? hint;
  if (found !== null) matched++;
  else if (hint !== null) fallback++;
  if (start !== null && start > 0) starts.excerpts[claim.path] = start;
}

const index = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "explore-sources.json"), "utf8")) as SourceIndex;
let sourceMatched = 0;
for (const [kind, id, , , snippet] of index.items) {
  if (kind !== "y") continue;
  const c = cues(id);
  const found = c ? matchStart(snippet, c) : null;
  if (found !== null && found > 0) {
    starts.sources[id] = found;
    sourceMatched++;
  }
}

fs.writeFileSync(OUT, JSON.stringify(starts) + "\n");
console.log(`excerpts: ${matched} matched, ${fallback} from url; sources: ${sourceMatched} matched; transcripts: ${folders.size}`);
