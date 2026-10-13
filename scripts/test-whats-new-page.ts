import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DraftList, { type Draft } from "../src/app/admin/whats-new/DraftList";
import GenerationCard, { STATE_LABEL, toolLabel, type Generation } from "../src/app/whats-new/GenerationCard";
import { Timeline } from "../src/app/whats-new/LiveTimeline";
import { mergeEntries } from "../src/lib/whats-new/public";
import { dayHeading, POLL_MS, rowTime, timeline, timelineKey, type TimelineEntry } from "../src/lib/whats-new/timeline";
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
  assert.ok(unknown.includes("made by a machine") && unknown.includes(">state unknown<") && !unknown.includes(">pending<"));
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
  assert.ok(html.includes("Produced by the Solver gap engine") && !html.includes("momentum.py"));
  for (const tool of ["predict.py", "scripts/run.sh", "unknown-tool v2", ""]) assert.ok(!card(generation({ tool })).includes("Produced by"), tool);
  assert.equal(toolLabel("hte serve"), "History hypothesis engine");
  assert.ok(html.includes('href="#prod-one"') && html.includes("from Gap score backtest"));
  assert.match(html, /href="https:\/\/github\.com\/bucket-foundation\/bucket-foundation\/pull\/519" target="_blank" rel="noopener noreferrer"/);
  const bare = card(generation({ claim: undefined, score: undefined, evidence: undefined, parent: undefined }));
  assert.ok(!bare.includes("Score") && !bare.includes("evidence 1") && !bare.includes("from "));
  assert.ok(!card(generation()).includes('href="#prod-one"'));
  assert.ok(!card(generation()).includes("not published"));
});

test("the timeline is one stream, newest first, under day headers, with a time on every row", () => {
  const base = { poster: "ada", created_at: "2026-10-02T09:00:00.000Z", updated_at: "t", body_hash: "h", source: "own" };
  const stored: StoredEntry[] = [
    { ...base, id: "gen-live", kind: "generation", category: "generation", review_state: "published", published_at: "2026-10-02T10:00:00.000Z", date: "2026-10-02", at: "2026-10-02T08:15:00.000Z", state: "refuted", title: "Live", machine_generated: true, tool: "x", evidence: ["https://github.com/bucket-foundation/bucket-foundation/pull/519"] },
    { ...base, id: "gen-draft", kind: "generation", category: "generation", review_state: "draft", date: "2026-10-02", state: "tested", title: "Draft" },
    { ...base, id: "gen-dead", kind: "generation", category: "generation", review_state: "deleted", date: "2026-10-01" },
    { ...base, id: "prod-live", kind: "production", category: "production", review_state: "published", published_at: "2026-10-02T11:00:00.000Z", date: "2026-10-02", at: "2026-10-02T09:30:00+02:00", title: "Prod", summary: "s", plot_title: "p", image_alt: "a", links: [], status: "merged" },
    { ...base, id: "gen-auto", kind: "generation", category: "generation", review_state: "published", autopublished: true, published_at: "2026-10-02T12:00:00.000Z", date: "2026-09-23", at: "2026-09-23T17:40:00.000Z", state: "candidate", title: "Upstream solved", machine_generated: true, tool: "x" },
  ];
  const merged = mergeEntries([{ id: "pr-1", date: "2026-10-01", category: "pr-merged", title: "Merged", pr: 12 }], stored);
  const days = timeline(merged);
  assert.deepEqual(days.map((d) => [d.day, d.rows.map((r) => [r.entry.id, r.size, r.time])]), [
    ["2026-10-02", [["gen-live", "small", "08:15 UTC"], ["prod-live", "large", "07:30 UTC"]]],
    ["2026-10-01", [["pr-1", "small", null]]],
    ["2026-09-23", [["gen-auto", "small", "17:40 UTC"]]],
  ]);
  assert.equal(dayHeading("2026-10-02"), "Friday, October 2, 2026");
  assert.equal(timelineKey({ id: "x", date: "2026-10-01", at: "nonsense" }), "2026-10-01T00:00:00.000Z");
  assert.equal(rowTime({ id: "x", date: "2026-10-01" }), null);

  const html = renderToStaticMarkup(createElement(Timeline, { entries: merged as unknown as TimelineEntry[] }));
  const order = ["Friday, October 2, 2026", 'id="gen-live"', "08:15 UTC", "07:30 UTC", 'id="prod-live"', "Thursday, October 1, 2026", 'id="pr-1"', "no time", "Wednesday, September 23, 2026", 'id="gen-auto"'];
  let at = -1;
  for (const want of order) {
    const next = html.indexOf(want, at + 1);
    assert.ok(next > at, `${want} out of order`);
    at = next;
  }
  for (const hidden of ["gen-draft", "gen-dead"]) assert.ok(!html.includes(hidden), hidden);
  const live = html.slice(html.indexOf('id="gen-live"'), html.indexOf("</li>", html.indexOf('id="gen-live"')));
  for (const want of ["made by a machine", ">refuted<", "line-through", "generation", 'href="https://github.com/bucket-foundation/bucket-foundation/pull/519"', "evidence ↗"]) assert.ok(live.includes(want), want);
  const auto = html.slice(html.indexOf('id="gen-auto"'));
  assert.ok(auto.includes("not reviewed by a person") && auto.includes("candidate, not yet tested"));
  assert.ok(html.includes('href="https://github.com/bucket-foundation/bucket-foundation/pull/12"') && html.includes(">merged<"));
  assert.ok(!live.includes("not reviewed by a person"));
  assert.equal(renderToStaticMarkup(createElement(Timeline, { entries: [] })).includes("Nothing has been posted yet."), true);
});

test("the page reads the merged list, revalidates at 60 seconds and polls the public list once a minute", () => {
  const page = readFileSync(path.join(SRC, "app/whats-new/page.tsx"), "utf8");
  for (const want of ["export const revalidate = 60;", "await publicWhatsNew()", "<LiveTimeline initial={entries} />", "Times are in UTC. The page checks for new entries every minute."]) assert.ok(page.includes(want), want);
  for (const gone of ["MilestoneTimeline", "pageSections", "admin/whats-new"]) assert.ok(!page.includes(gone), gone);
  const live = readFileSync(path.join(SRC, "app/whats-new/LiveTimeline.tsx"), "utf8");
  assert.equal(POLL_MS, 60_000);
  for (const want of ['"use client";', 'fetch("/api/whats-new/entries", { cache: "no-store" })', "window.setInterval(poll, POLL_MS)", "window.clearInterval(timer)", 'document.visibilityState !== "visible"']) assert.ok(live.includes(want), want);
  assert.ok(!live.includes("state=draft") && !live.includes("authorization"));
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
