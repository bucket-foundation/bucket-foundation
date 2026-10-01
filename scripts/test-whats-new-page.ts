import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DraftList, { type Draft } from "../src/app/admin/whats-new/DraftList";
import GenerationCard, { STATE_LABEL, type Generation } from "../src/app/whats-new/GenerationCard";
import { mergeEntries, pageSections } from "../src/lib/whats-new/public";
import { GENERATION_STATES } from "../src/lib/whats-new/schema";
import type { StoredEntry } from "../src/lib/whats-new/store";

const SRC = path.join(__dirname, "..", "src");

function generation(over: Partial<Generation> = {}): Generation {
  return {
    id: "gen-one",
    date: "2026-10-01",
    title: "Sibling momentum",
    state: "tested",
    tool: "solver-gap-engine momentum.py",
    claim: "A solved sibling raises the next resolution rate.",
    score: { value: 0.143, meaning: "rate with a solved sibling, against 0.145 without" },
    evidence: ["https://github.com/bucket-foundation/bucket-foundation/pull/519"],
    parent: "prod-one",
    ...over,
  };
}

const card = (g: Generation, parentTitle?: string, draftBy?: string): string => renderToStaticMarkup(createElement(GenerationCard, { generation: g, parentTitle, draftBy }));

test("every generation card carries the machine-made label and its state in plain words", () => {
  assert.deepEqual(Object.keys(STATE_LABEL).sort(), [...GENERATION_STATES].sort());
  for (const state of GENERATION_STATES) {
    const html = card(generation({ state }));
    assert.ok(html.includes("made by a machine"), state);
    assert.ok(html.includes(`>${STATE_LABEL[state]}<`), state);
    assert.ok(html.includes(`data-state="${state}"`), state);
    assert.ok(html.includes('id="gen-one"'), state);
  }
  const unknown = card(generation({ state: "pending" }));
  assert.ok(unknown.includes("made by a machine") && unknown.includes(">pending<"));
});

test("a refuted generation is shown, labelled refuted, with the reason it stays", () => {
  const html = card(generation({ state: "refuted" }));
  assert.ok(html.includes(">refuted<"));
  assert.ok(html.includes("the claim failed"));
  assert.ok(html.includes("line-through"));
  assert.ok(html.includes("Sibling momentum"));
  assert.ok(!card(generation({ state: "tested" })).includes("line-through"));
});

test("the card shows claim, score, tool, parent and evidence, and escapes posted text", () => {
  const html = card(generation({ title: "<script>alert(1)</script>", claim: 'a "quoted" <b>claim</b>' }), "Gap score backtest");
  assert.ok(!html.includes("<script>") && html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<b>claim</b>"));
  assert.ok(html.includes("Score <span") && html.includes("0.143") && html.includes("against 0.145 without"));
  assert.ok(html.includes("Produced by solver-gap-engine momentum.py"));
  assert.ok(html.includes('href="#prod-one"') && html.includes("from Gap score backtest"));
  assert.match(html, /href="https:\/\/github\.com\/bucket-foundation\/bucket-foundation\/pull\/519" target="_blank" rel="noopener noreferrer"/);
  const bare = card(generation({ claim: undefined, score: undefined, evidence: undefined, parent: undefined }));
  assert.ok(!bare.includes("Score") && !bare.includes("evidence 1") && !bare.includes("from "));
  assert.ok(!card(generation()).includes('href="#prod-one"'));
  assert.ok(!card(generation()).includes("not published"));
});

test("the page lists published generations in their own section and keeps them out of milestones", () => {
  const base = { poster: "ada", created_at: "t", updated_at: "t", body_hash: "h", source: "own" };
  const stored: StoredEntry[] = [
    { ...base, id: "gen-live", kind: "generation", category: "generation", review_state: "published", published_at: "2026-10-02T01:00:00.000Z", date: "2026-10-01", state: "refuted", title: "Live" },
    { ...base, id: "gen-draft", kind: "generation", category: "generation", review_state: "draft", date: "2026-10-01", state: "tested", title: "Draft" },
    { ...base, id: "gen-dead", kind: "generation", category: "generation", review_state: "deleted", date: "2026-10-01" },
    { ...base, id: "prod-live", kind: "production", category: "production", review_state: "published", published_at: "2026-10-02T01:00:00.000Z", date: "2026-10-01", title: "Prod" },
  ];
  const sections = pageSections(mergeEntries([{ id: "pr-1", date: "2026-09-30", category: "pr-merged" }], stored));
  assert.deepEqual(sections.generations.map((e) => e.id), ["gen-live"]);
  assert.deepEqual(sections.productions.map((e) => e.id), ["prod-live"]);
  assert.deepEqual(sections.milestones.map((e) => e.id), ["pr-1"]);
  const page = readFileSync(path.join(SRC, "app/whats-new/page.tsx"), "utf8");
  for (const want of ["<GenerationCard", 'id="generations"', "sections.generations", "Claims made by a machine.", "Refuted claims stay on the page."]) assert.ok(page.includes(want), want);
  assert.ok(!page.includes("admin/whats-new") && !page.includes("DraftList"));
});

test("the draft list shows who posted each draft and says nothing is public", () => {
  const drafts: Draft[] = [
    { id: "prod-one", kind: "production", date: "2026-10-01", title: "Gap score backtest", poster: "ada", updated_at: "t", source: "own", summary: "A summary.", plot_title: "Plot", image_alt: "a bar chart", links: [{ label: "PR", href: "https://github.com/bucket-foundation/bucket-foundation/pull/519" }], image: { filename: "plot.webp", width: 640, height: 480, bytes: 100 } },
    { id: "prod-two", kind: "production", date: "2026-10-01", title: "Borrowed", poster: "bob", updated_at: "t", source: "third-party" },
    { ...generation({ state: "refuted" }), kind: "generation", poster: "ada", updated_at: "t" },
  ];
  const html = renderToStaticMarkup(createElement(DraftList, { drafts }));
  assert.ok(html.includes("2 draft productions and 1 draft generation. Nothing here is public until it is published."));
  assert.ok(html.includes("draft by ada, not published") && html.includes("draft by bob, not published"));
  assert.ok(html.includes("not own work, cannot be published"));
  assert.ok(html.includes("Image plot.webp, 640 by 480 pixels. Described as: a bar chart") && html.includes("No image."));
  assert.ok(html.includes("made by a machine") && html.includes(">refuted<") && html.includes("from Gap score backtest"));
  assert.equal(renderToStaticMarkup(createElement(DraftList, { drafts: [] })).includes("No drafts are waiting."), true);
});

test("the drafts page is admin only: no index, a key held in memory, and the admin draft list as its one source", () => {
  const page = readFileSync(path.join(SRC, "app/admin/whats-new/page.tsx"), "utf8");
  assert.ok(page.includes("robots: { index: false, follow: false }"));
  const client = readFileSync(path.join(SRC, "app/admin/whats-new/DraftsAdmin.tsx"), "utf8");
  assert.ok(client.includes('fetch("/api/whats-new/entries?state=draft", { headers: { authorization: `Bearer ${key}` }, cache: "no-store" })'));
  assert.ok(client.includes('type="password"'));
  for (const banned of ["sessionStorage", "localStorage", "document.cookie", "console."]) assert.ok(!client.includes(banned), banned);
  const list = readFileSync(path.join(SRC, "app/admin/whats-new/DraftList.tsx"), "utf8");
  for (const banned of ["getWhatsNewStore", "listEntries", "process.env"]) assert.ok(!list.includes(banned) && !client.includes(banned), banned);
  const sitemap = readFileSync(path.join(SRC, "app/sitemap.ts"), "utf8");
  assert.ok(!sitemap.includes("admin/whats-new"));
});
