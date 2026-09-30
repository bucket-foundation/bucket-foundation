import { CANON_FILES, canonFileHits, canonFileId, type CanonFile } from "../src/lib/explore/canon-files";
import { HIT_TYPES, unify } from "../src/lib/explore/search";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const files: CanonFile[] = [
  { title: "Canon — Physics", branch: "02-physics", path: "02-physics/CANON.md", size: 152 },
  { title: "Bucket Canon — Mathematics", branch: "01-mathematics", path: "01-mathematics/README.md", size: 1300 },
];

check("bundled index has files", CANON_FILES.length >= 20);
check("index rows hold only title, branch, path, size", CANON_FILES.every((f) => Object.keys(f).sort().join() === "branch,path,size,title"));
check("index carries no emails", !/@[\w-]+\.\w/.test(JSON.stringify(CANON_FILES)));
check("canon-file is a hit type", HIT_TYPES.includes("canon-file"));
const hits = canonFileHits("physics", files);
check("query matches a file by title", hits.length === 1 && hits[0].id === canonFileId(files[0]));
check("hit has the canon-file type and no full text", hits[0].type === "canon-file" && hits[0].text === "" && hits[0].url === null);
check("no match gives no hits", canonFileHits("zebra", files).length === 0);
check("topK caps the hits", canonFileHits("canon", files, 1).length === 1);
const merged = unify({ query: "physics", excerpts: [], advisors: [], extraHits: hits });
check("unify appends extra hits", merged.length === 1 && merged[0].type === "canon-file");
check("type filter drops canon files", unify({ query: "physics", excerpts: [], advisors: [], extraHits: hits, types: ["excerpt"] }).length === 0);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
