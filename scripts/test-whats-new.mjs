import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { leakHits, entryLeaks, filterEntries, leakOptions } from "./whats-new-leak-filter.mjs";
import { validateProduction, wordCount } from "./whats-new-production.mjs";
import {
  parsePrCommit,
  isSkipped,
  summarizeTitle,
  prEntry,
  prsFromCommits,
  mergeEntries,
} from "./build-whats-new-entry.mjs";

const opts = leakOptions({ privateTerms: ["secretcorpus"], internalHosts: ["ops.example.org"] });
const kinds = (text) => leakHits(text, opts).map((h) => h.kind);
const slash = "/";

test("secrets are caught", () => {
  const samples = [
    "-----BEGIN RSA " + "PRIVATE KEY-----",
    "eyJhbGciOiJIUzI1NiJ9" + ".eyJzdWIiOiIxMjM0NTY3ODkwIn0" + ".c2lnbmF0dXJlc2lnbmF0dXJl",
    "sk-" + "ant-" + "a".repeat(30),
    "gh" + "p_" + "A1b2C3d4".repeat(5),
    "AK" + "IA" + "ABCDEFGHIJKLMNOP",
    "0x" + "ab".repeat(32),
    "set SUPABASE_SERVICE_ROLE_" + "KEY=abcd1234efgh",
    "password" + ": hunter2hunter2",
  ];
  for (const s of samples) assert.ok(kinds(s).includes("secret"), s.slice(0, 12));
});

test("private corpora are caught, the defaults and the configured list", () => {
  assert.ok(kinds("Notes from the Kruse archive").includes("private-corpus"));
  assert.ok(kinds("mirror of jackkruse.com posts").includes("private-corpus"));
  assert.ok(kinds("loaded secretcorpus v2").includes("private-corpus"));
});

test("private corpora are caught through zero-width characters", () => {
  assert.ok(kinds("kru\u200Bse notes").includes("private-corpus"));
  assert.ok(kinds("kr\u2060u\uFEFFse").includes("private-corpus"));
});

test("private corpora are caught through letter spacing and punctuation", () => {
  assert.ok(kinds("the K r u s e posts").includes("private-corpus"));
  assert.ok(kinds("k.r.u.s.e archive").includes("private-corpus"));
  assert.ok(kinds("k-r-u-s-e").includes("private-corpus"));
});

test("private corpora are caught through Unicode confusables", () => {
  assert.ok(kinds("\u212Aruse archive").includes("private-corpus"));
  assert.ok(kinds("\u043Aru\u0455\u0435 archive").includes("private-corpus"));
  assert.ok(kinds("\uFF4B\uFF52\uFF55\uFF53\uFF45").includes("private-corpus"));
});

test("private corpora are caught inside base64 tokens", () => {
  const encoded = Buffer.from("kruse corpus").toString("base64");
  assert.ok(kinds(`payload ${encoded}`).includes("private-corpus"));
  const urlSafe = Buffer.from("jackkruse").toString("base64url");
  assert.ok(kinds(`id=${urlSafe}`).includes("private-corpus"));
});

test("configured private terms come from the environment", () => {
  process.env.WHATS_NEW_PRIVATE_TERMS = "envcorpus, other";
  try {
    assert.ok(leakHits("from envcorpus", leakOptions()).some((h) => h.kind === "private-corpus"));
  } finally {
    delete process.env.WHATS_NEW_PRIVATE_TERMS;
  }
});

test("personal data is caught", () => {
  assert.ok(kinds("mail someone" + "@" + "example.com").includes("email"));
  assert.ok(kinds("call 555-867-5309 today").includes("phone"));
  assert.ok(kinds("call +1 (555) 867-5309").includes("phone"));
});

test("hosts, IPs and ports are caught", () => {
  assert.ok(kinds("served from 10.0.4.12").includes("ip"));
  assert.ok(kinds("engine on 127.0.0.1:8420").includes("ip"));
  assert.ok(kinds("open localhost:3000").includes("localhost"));
  assert.ok(kinds("db at pg.cluster.internal").includes("internal-host"));
  assert.ok(kinds("see nucleus.agfarms.dev").includes("internal-host"));
  assert.ok(kinds("see ops.example.org/admin").includes("internal-host"));
});

test("absolute paths are caught", () => {
  for (const root of ["home", "Users", "tmp"]) {
    assert.ok(kinds(`wrote ${slash}${root}${slash}someone${slash}file.txt`).includes("absolute-path"), root);
  }
  assert.ok(kinds("under ~/private/notes").includes("absolute-path"));
});

test("clean text passes through", () => {
  const clean = [
    "feat(ros): prime directions engine, globe render, video and gap analysis",
    "Modularity 0.278 against -0.001 for shuffled labels, v0.6.81 released",
    "https://github.com/bucket-foundation/bucket-foundation/pull/353",
    "/whats-new/80k-prime-directions.webp",
    "5,988 x 13,872 binary document-term matrix, dated 2026-09-27",
  ];
  for (const s of clean) assert.deepEqual(leakHits(s, opts), [], s);
  const entry = { id: "pr-1", title: "Canon page", summary: "New in site: canon page.", links: [{ href: "https://bucket.foundation/canon" }] };
  const { kept, dropped } = filterEntries([entry], opts);
  assert.deepEqual(kept, [entry]);
  assert.equal(dropped.length, 0);
});

test("a leak in a nested field drops the entry", () => {
  const bad = { id: "x", title: "ok", links: [{ label: "log", href: `file://${slash}tmp${slash}run.log` }] };
  const hits = entryLeaks(bad, opts);
  assert.equal(hits[0].field, "links[0].href");
  const { kept, dropped } = filterEntries([bad], opts);
  assert.equal(kept.length, 0);
  assert.equal(dropped[0].entry.id, "x");
});

test("every entry in data/whats-new.json passes the leak filter", () => {
  const data = JSON.parse(readFileSync("data/whats-new.json", "utf8"));
  const { dropped } = filterEntries(data.entries);
  assert.deepEqual(dropped.map((d) => d.entry.id), []);
});

test("squash and merge subjects become PRs, batch merges are skipped", () => {
  const squash = parsePrCommit({ sha: "e8e750641636", subject: "feat(ros): prime directions (#353)", date: "2026-09-27T23:43:45-04:00", author: "Gianyrox" });
  assert.equal(squash.number, 353);
  assert.equal(squash.title, "feat(ros): prime directions");
  const merge = parsePrCommit({ sha: "abc1234", subject: "Merge pull request #12 from bucket-foundation/feat/site-x", body: "\nfeat(site): x page\n", date: "2026-09-27", author: "a" });
  assert.equal(merge.number, 12);
  assert.equal(merge.title, "feat(site): x page");
  assert.equal(parsePrCommit({ sha: "a", subject: "Merge pull request #201 from bucket-foundation/dev", body: "release", date: "2026-09-27" }), null);
  assert.equal(parsePrCommit({ sha: "a", subject: "wip on something", date: "2026-09-27" }), null);
});

test("bot, ops, beads backup and skip ci commits are skipped", () => {
  assert.ok(isSkipped({ subject: "bd: backup 2026-09-24 04:54" }));
  assert.ok(isSkipped({ subject: "chore(beads): untrack the raw backup folder (#329)" }));
  assert.ok(isSkipped({ subject: "ops(gate): load gate (#10)" }));
  assert.ok(isSkipped({ subject: "whats-new: append milestone entries [skip ci]" }));
  assert.ok(isSkipped({ subject: "feat(x): y (#5)", author: "dependabot[bot]" }));
  assert.ok(isSkipped({ subject: "feat(x): y (#5)", headRef: "ops/weekly-ledger" }));
  assert.ok(!isSkipped({ subject: "feat(site): GitHub star button in the header (#350)", author: "Gianyrox" }));
  const prs = prsFromCommits([
    { sha: "1", subject: "bd: backup 2026-09-24", date: "2026-09-24", author: "gianyrox" },
    { sha: "2", subject: "feat(site): star button (#350)", date: "2026-09-27", author: "Gianyrox" },
    { sha: "3", subject: "feat(site): star button (#350)", date: "2026-09-27", author: "Gianyrox" },
  ]);
  assert.deepEqual(prs.map((p) => p.number), [350]);
});

test("a PR entry carries title, date, number, link and a summary from the title", () => {
  assert.deepEqual(summarizeTitle("fix(academy): the tutor withholds answers"), {
    headline: "The tutor withholds answers",
    summary: "Fix in academy: the tutor withholds answers.",
  });
  const e = prEntry({ number: 350, title: "feat(site): GitHub star button in the header", sha: "67fb4ad15aaa", date: "2026-09-27T10:00:00Z" });
  assert.equal(e.id, "pr-350");
  assert.equal(e.date, "2026-09-27");
  assert.equal(e.pr, 350);
  assert.equal(e.url, "https://github.com/bucket-foundation/bucket-foundation/pull/350");
  assert.equal(e.commit, "67fb4ad");
  assert.equal(e.summary, "New in site: GitHub star button in the header.");
});

test("mergeEntries keeps clean new entries once and leaves leaking ones out", () => {
  const data = { version: "0.1", entries: [{ id: "pr-1", date: "2026-09-01", title: "a", summary: "b" }] };
  const fresh = [
    { id: "pr-1", date: "2026-09-01", title: "a", summary: "b" },
    { id: "pr-2", date: "2026-09-02", title: "clean", summary: "New in site: clean." },
    { id: "pr-3", date: "2026-09-03", title: "leak", summary: `reads ${slash}home${slash}someone${slash}x` },
  ];
  const { added, dropped } = mergeEntries(data, fresh, opts);
  assert.equal(added, 1);
  assert.deepEqual(dropped.map((d) => d.entry.id), ["pr-3"]);
  assert.deepEqual(data.entries.map((e) => e.id), ["pr-2", "pr-1"]);
});

test("a merged PR already covered by a production entry gets no pr-merged entry", () => {
  const data = { version: "0.1", entries: [{ id: "production-x", category: "production", pr: 353, date: "2026-09-27", title: "p", summary: "s" }] };
  const fresh = [
    prEntry({ number: 353, title: "feat(ros): prime directions", sha: "e8e750641636", date: "2026-09-27T00:00:00Z" }),
    prEntry({ number: 350, title: "feat(site): star button", sha: "67fb4ad15aaa", date: "2026-09-27T00:00:00Z" }),
  ];
  const { added } = mergeEntries(data, fresh, opts);
  assert.equal(added, 1);
  assert.deepEqual(data.entries.map((e) => e.id).sort(), ["pr-350", "production-x"]);
});

test("production entries in the data file validate: word count, images, links", () => {
  const data = JSON.parse(readFileSync("data/whats-new.json", "utf8"));
  const productions = data.entries.filter((e) => e.category === "production");
  assert.ok(productions.length >= 2);
  for (const p of productions) assert.deepEqual(validateProduction(p), [], p.id);
});

test("production validation rejects long discussions and missing images", () => {
  const dir = mkdtempSync(join(tmpdir(), "whats-new-"));
  mkdirSync(join(dir, "whats-new"));
  writeFileSync(join(dir, "whats-new", "ok.webp"), "x");
  const base = {
    id: "p",
    date: "2026-09-27",
    category: "production",
    title: "t",
    summary: "s",
    plot_title: "pt",
    discussion: "short discussion",
    image: "/whats-new/ok.webp",
    image_alt: "alt",
    status: "open",
    links: [{ label: "PR", href: "https://github.com/x/y/pull/1" }],
  };
  assert.deepEqual(validateProduction(base, { publicDir: dir }), []);
  const long = { ...base, discussion: Array.from({ length: 100 }, () => "word").join(" ") };
  assert.equal(wordCount(long.discussion), 100);
  assert.match(validateProduction(long, { publicDir: dir }).join("\n"), /100 words/);
  const missing = { ...base, image: "/whats-new/gone.webp" };
  assert.match(validateProduction(missing, { publicDir: dir }).join("\n"), /missing/);
  const noLinks = { ...base, links: [] };
  assert.match(validateProduction(noLinks, { publicDir: dir }).join("\n"), /links/);
});
