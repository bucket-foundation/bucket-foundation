import { isExcluded, buildIndex, branchOf, scrub, titleOf } from "./build-explore-canon-drive.mjs";

let failed = 0;
function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failed++;
}

check("numbered folder is the branch", branchOf("05-biophysics/CANON.md") === "05-biophysics");
check("root files take the canon branch", branchOf("CANON_INDEX.md") === "canon");
check("emails are scrubbed", scrub("Contact a.b@example.com now") === "Contact now");
check("title comes from the first heading", titleOf("x/y.md", "intro\n# **Real** Title\n") === "Real Title");
check("title falls back to the file name", titleOf("x/notes.md", "no heading") === "notes");
const idx = buildIndex(
  [
    { Path: "b/z.md", Size: 5, IsDir: false },
    { Path: "a/y.pdf", Size: 9, IsDir: false },
    { Path: "a", Size: 0, IsDir: true },
    { Path: "a/x.md", Size: 7, IsDir: false },
  ],
  (p) => `# ${p} me@x.org`,
);
check("only markdown files are indexed, sorted", idx.map((f) => f.path).join() === "a/x.md,b/z.md");
check("rows carry no text or emails", idx.every((f) => Object.keys(f).join() === "title,branch,path,size" && !f.title.includes("@")));
check("intake files and taxonomy notes are excluded", isExcluded("_intake/README.md") && isExcluded("TAXONOMY_NOTES.md") && !isExcluded("02-physics/CANON.md"));
const kept = buildIndex([{ Path: "_intake/README.md", Size: 1, IsDir: false }, { Path: "TAXONOMY_NOTES.md", Size: 1, IsDir: false }, { Path: "a/x.md", Size: 1, IsDir: false }], () => "");
check("excluded files never reach the index", kept.length === 1 && kept[0].path === "a/x.md");
if (failed) process.exit(1);
console.log("all passed");
