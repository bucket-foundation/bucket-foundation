import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { applyDecision, atomParts, atomState, cleanReviewer, decisionKey, deckProgress, parseDecisions, parseEdges, parseLinks, queuedAtoms, REASONS, REVIEW_SCHEMA, REVIEW_SLUG, serializeDecisions, today, verifiedTable, type Decision } from "./alignment";
import type { Api, ResearchDetail, ReviewRow, SaveResult } from "./api";
import { parseHash } from "./router";
import type { AlignmentApi } from "./views/Alignment";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
});

const LINKS_PATH = "data/review/links.jsonl";
const EDGES_PATH = "data/review/edges.jsonl";
const NOTES_PATH = "data/review/decisions.jsonl";
const link = (row: string, atom: string, score: number, over = "") =>
  `{"schema": "bucket.alignment/1", "id": "align:${row}~${atom}", "progression_id": "${row}", "table": "courses", "framework_id": null, "course_code": "C ${row}", "level": "graduate", "atom": "atom:${atom}", "match": "broader", "score": ${score}, "method": "embedding+rule", "source_url": "https://example.org/${row}", "status": "unreviewed-proposal", "verified": false, "verification": {"status": "asserted", "by": "agent", "at": "2026-10-12"}, "note": ""${over}}`;
const LINKS = `${[
  link("c1", "01-mathematics/limits", 0.81),
  link("c2", "01-mathematics/limits", 0.74),
  link("k1", "01-mathematics/limits", 0.7),
  link("c3", "01-mathematics/series", 0.72),
  `{"schema": "bucket.alignment/1", "id": "align:none~01-mathematics/sets", "progression_id": null, "table": null, "level": null, "atom": "atom:01-mathematics/sets", "match": "none", "score": 0.5, "method": "below", "source_url": null, "status": "unreviewed-proposal", "verified": false, "verification": {"status": "asserted", "by": "agent", "at": "2026-10-12"}, "note": ""}`,
  link("p1", "02-physics/energy", 0.9),
].join("\n")}\n`;
const EDGES = `${JSON.stringify({ deck: "01-mathematics", prerequisite: "atom:01-mathematics/limits", dependent: "atom:01-mathematics/series", queue: "review-first" })}\n${JSON.stringify({ deck: "02-physics", prerequisite: "atom:02-physics/energy", dependent: "atom:02-physics/work", queue: "no-corpus-path" })}\n`;
const ROWS: Record<string, ReviewRow> = {
  c1: { id: "c1", table: "courses", code: "MATH 101", label: "Calculus I", level: "undergraduate-lower", where: "Example University", url: "https://example.org/c1", cip: "27.01" },
  c2: { id: "c2", table: "courses", code: "MATH 480", label: "Real Analysis", level: "graduate", where: "Sample College", url: "https://example.org/c2", cip: "27.01" },
  k1: { id: "k1", table: "progression", code: "HS.F.1", label: null, level: "upper-secondary", where: "a-closed-system", url: "https://example.org/k1", cip: "27.01" },
  c3: { id: "c3", table: "courses", code: "MATH 210", label: "Sequences and Series", level: "undergraduate-upper", where: "Example University", url: "https://example.org/c3", cip: "27.01" },
  x9: { id: "x9", table: "courses", code: "MATH 105", label: "Set Theory", level: "undergraduate-lower", where: "Sample College", url: "https://example.org/x9", cip: "27.01" },
};
const DETAIL = {
  slug: REVIEW_SLUG,
  origin: "staff",
  staff: true,
  withheld: 0,
  unreadable: null,
  files: [],
  manifest: { schema: "bucket.report/2", slug: REVIEW_SLUG, title: "Atom alignment, review queue", authors: [], date: "2026-10-12", status: "private", kind: "dataset-report", source_path: "data/review/README.md", source_hash: "a".repeat(64), tables: [{ id: "alignments", path: LINKS_PATH, format: "jsonl", label: "Links", licence: "CC-BY-4.0", audience: "staff" }, { id: "edges", path: EDGES_PATH, format: "jsonl", label: "Edges", licence: "CC-BY-4.0", audience: "staff" }, { id: "decisions", path: NOTES_PATH, format: "jsonl", label: "Decisions", licence: "CC-BY-4.0", audience: "staff", editable: true }] },
} as unknown as ResearchDetail;

function fakeApi(start = "") {
  const calls: string[] = [];
  const files: Record<string, string> = { [LINKS_PATH]: LINKS, [EDGES_PATH]: EDGES, [NOTES_PATH]: start };
  const changed = new Set<string>();
  const rev = (text: string) => `rev-${text.length}-${text.slice(-12)}`;
  const api = {
    researchManifest: async (slug: string) => {
      if (slug !== REVIEW_SLUG) throw Object.assign(new Error("Bucket could not find that."), { status: 404 });
      return DETAIL;
    },
    researchText: async (_slug: string, path: string) => files[path],
    researchSource: async (_slug: string, path: string) => ({ text: files[path], rev: rev(files[path]) }),
    researchSave: async (_slug: string, path: string, base: string, text: string): Promise<SaveResult> => {
      calls.push(`save ${path}`);
      if (base !== rev(files[path])) return { saved: false, current: rev(files[path]) };
      files[path] = text;
      changed.add(path);
      return { saved: true, rev: rev(text), changed: true };
    },
    researchChanges: async () => ({ notice: "", changes: [...changed].map((path) => ({ path })) }),
    researchRevert: async (_slug: string, path: string) => {
      calls.push(`revert ${path}`);
      if (path === LINKS_PATH) files[path] = LINKS;
      changed.delete(path);
      return { path, changed: changed.size };
    },
    researchExport: async () => (calls.push("export"), { dir: "the export folder", files: ["CHANGES.patch", LINKS_PATH, NOTES_PATH] }),
    decks: async () => [{ id: "01-mathematics", title: "Mathematics" }, { id: "02-physics", title: "Physics" }],
    atoms: async (deck: string) => (deck === "01-mathematics" ? [{ id: "limits", title: "Limits", summary: "A limit is the value a function approaches." }, { id: "series", title: "Series", summary: "A series is a sum of a sequence." }, { id: "sets", title: "Sets", summary: "A set is a collection." }] : [{ id: "energy", title: "Energy", summary: "Energy is conserved." }]),
    alignmentRows: async (ids: string[]) => (calls.push(`rows ${ids.join(",")}`), { staff: true, rows: ids.flatMap((id) => (ROWS[id] ? [ROWS[id]] : [])) }),
    alignmentSearch: async (deck: string, q: string) => (calls.push(`search ${deck} ${q}`), { staff: true, rows: q === "set" ? [ROWS.x9] : [] }),
    openLink: async (url: string) => (calls.push(`open ${url}`), { opened: url }),
  } as unknown as AlignmentApi;
  return { api, calls, files };
}

async function mount(node: React.ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  const settle = async () => {
    for (let i = 0; i < 6; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  };
  await settle();
  const click = async (el: Element | null | undefined) => {
    await act(async () => (el as HTMLElement).click());
    await settle();
  };
  const key = async (k: string) => {
    await act(async () => void host.querySelector(".alignment")!.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })));
    await settle();
  };
  const type = async (input: Element, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await settle();
  };
  return { host, act, settle, click, key, type, unmount: () => act(async () => root.unmount()) };
}

const press = (host: Element, label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);

async function pane(f: ReturnType<typeof fakeApi>, name = "Ada Example") {
  if (name) window.localStorage.setItem("bucket.review.name", name);
  const { AlignmentPane } = await import("./views/Alignment");
  return mount(<AlignmentPane api={f.api} />);
}

const made = (linkId: string | null, atom: string, kind: Decision["decision"], over: Partial<Decision> = {}): Decision => ({ schema: REVIEW_SCHEMA, atom, link: linkId, row: null, decision: kind, reason: null, reviewer: "Ada Example", at: "2026-10-13", ...over });

describe("review decisions", () => {
  test("a decision replaces the earlier one for the same link, and a removal drops it", () => {
    const a = "atom:01-mathematics/limits";
    let text = applyDecision("", made("align:c1~x", a, "wrong"));
    text = applyDecision(text, made("align:c2~x", a, "partly", { reason: "broader" }));
    text = applyDecision(text, made("align:c1~x", a, "right"));
    expect(parseDecisions(text).map((d) => [d.link, d.decision, d.reason])).toEqual([["align:c1~x", "right", null], ["align:c2~x", "partly", "broader"]]);
    text = applyDecision(text, made(null, a, "no-match"));
    text = applyDecision(text, made(null, a, "added", { row: "x9" }));
    expect(parseDecisions(text).map(decisionKey)).toEqual([`${a}|align:c1~x`, `${a}|align:c2~x`, `${a}|none`, `${a}|row:x9`]);
    text = applyDecision(text, { remove: `${a}|none` });
    expect(parseDecisions(text).length).toBe(3);
    expect(text.endsWith("\n")).toBe(true);
    expect(serializeDecisions([])).toBe("");
    expect(text.split("\n")[0]).toBe(`{"schema":"${REVIEW_SCHEMA}","atom":"${a}","link":"align:c1~x","row":null,"decision":"right","reason":null,"reviewer":"Ada Example","at":"2026-10-13"}`);
  });

  test("a line with no reviewer, no date, an unknown decision, or partly with no reason is dropped", () => {
    const good = JSON.stringify(made("l", "atom:01-mathematics/limits", "right"));
    const bad = [{ reviewer: "" }, { at: "yesterday" }, { decision: "maybe" }, { decision: "partly", reason: null }, { decision: "partly", reason: "because" }, { atom: "limits" }, { schema: "other" }].map((over) => JSON.stringify({ ...made("l", "atom:01-mathematics/limits", "right"), ...over }));
    expect(parseDecisions([good, ...bad, "{broken", ""].join("\n")).length).toBe(1);
    expect(REASONS).toEqual(["wrong level", "broader", "narrower", "different topic in the same field"]);
    expect(cleanReviewer("  Ada‮   Example\u0007 ")).toBe("Ada Example");
    expect(cleanReviewer("x".repeat(200)).length).toBe(80);
    expect(today(new Date(2026, 9, 3))).toBe("2026-10-03");
    expect(atomParts("atom:01-mathematics/limits")).toEqual({ deck: "01-mathematics", slug: "limits" });
    expect(atomParts("atom:../x")).toBeNull();
  });

  test("progress counts atoms done, links decided and links marked right for each deck", () => {
    const links = parseLinks(LINKS);
    expect(links.length).toBe(6);
    const none = deckProgress(links, new Map());
    expect(none).toEqual([{ deck: "01-mathematics", atoms: 3, done: 0, links: 4, decided: 0, right: 0 }, { deck: "02-physics", atoms: 1, done: 0, links: 1, decided: 0, right: 0 }]);
    const a = "atom:01-mathematics/limits";
    const all = [made(`align:c1~01-mathematics/limits`, a, "right"), made(`align:c2~01-mathematics/limits`, a, "wrong"), made(`align:k1~01-mathematics/limits`, a, "partly", { reason: "narrower" }), made(null, "atom:01-mathematics/sets", "no-match")];
    const map = new Map(all.map((d) => [decisionKey(d), d]));
    expect(deckProgress(links, map)[0]).toEqual({ deck: "01-mathematics", atoms: 3, done: 2, links: 4, decided: 3, right: 1 });
    expect(atomState("atom:01-mathematics/series", links, map).done).toBe(false);
    expect(atomState("atom:01-mathematics/sets", links, new Map()).done).toBe(false);
    expect([...queuedAtoms(parseEdges(EDGES), "review-first")]).toEqual(["atom:01-mathematics/limits", "atom:01-mathematics/series"]);
    expect([...queuedAtoms(parseEdges(EDGES), "review-second")]).toEqual([]);
  });

  test("the exported table verifies the rows marked right alone and leaves every other byte as shipped", () => {
    const a = "atom:01-mathematics/limits";
    const decisions = [made("align:c1~01-mathematics/limits", a, "right", { reviewer: "Zoë Example" }), made("align:c2~01-mathematics/limits", a, "partly", { reason: "broader" }), made("align:k1~01-mathematics/limits", a, "wrong"), made(null, a, "added", { row: "x9" }), made(null, "atom:01-mathematics/sets", "no-match")];
    const out = verifiedTable(LINKS, decisions);
    expect(out.verified).toBe(1);
    const before = LINKS.split("\n");
    const after = out.text.split("\n");
    expect(after.length).toBe(before.length);
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(after[0]).toBe(before[0].replace('"verified": false, "verification": {"status": "asserted", "by": "agent", "at": "2026-10-12"}', '"verified": true, "verification": {"status": "verified", "by": "Zo\\u00eb Example", "at": "2026-10-13"}'));
    expect((JSON.parse(after[0]) as { verification: { by: string } }).verification.by).toBe("Zoë Example");
    expect(verifiedTable(LINKS, []).text).toBe(LINKS);
    expect(verifiedTable(LINKS, decisions.slice(1))).toEqual({ text: LINKS, verified: 0 });
    expect(verifiedTable(out.text, decisions).text).toBe(out.text);
  });
});

describe("review workspace", () => {
  test("a build with no review queue shows one plain line and reads nothing else", async () => {
    const { NO_QUEUE } = await import("./views/Alignment");
    const f = fakeApi();
    const api = { ...f.api, researchManifest: () => Promise.reject(Object.assign(new Error("Bucket could not find that."), { status: 404 })) } as AlignmentApi;
    const { AlignmentPane } = await import("./views/Alignment");
    const v = await mount(<AlignmentPane api={api} />);
    expect(v.host.textContent).toBe(NO_QUEUE);
    expect(f.calls).toEqual([]);
    await v.unmount();
  });

  test("lists decks with progress, then the atoms of one deck, then one atom with its statement and each proposed row", async () => {
    const { NO_LABEL } = await import("./views/Alignment");
    const f = fakeApi(applyDecision("", made("align:p1~02-physics/energy", "atom:02-physics/energy", "right")));
    const v = await pane(f);
    expect(Array.from(v.host.querySelectorAll(".alignment-decks tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent))).toEqual([["Mathematics", "0 of 3", "0 of 4", "0"], ["Physics", "1 of 1", "1 of 1", "1"]]);
    expect(v.host.querySelector('[role="status"]')!.textContent).toBe("1 of 5 links decided");
    await v.click(press(v.host, "Mathematics"));
    expect(Array.from(v.host.querySelectorAll(".alignment-atoms li")).map((li) => li.textContent)).toEqual(["Limits0 of 3", "Series0 of 1", "SetsNo link proposed"]);
    await v.click(v.host.querySelector(".alignment-atoms li button"));
    expect(v.host.querySelector(".alignment-atom h3")!.textContent).toBe("Limits");
    expect(v.host.querySelector(".alignment-statement")!.textContent).toBe("A limit is the value a function approaches.");
    expect(f.calls).toContain("rows c1,c2,k1");
    const cards = Array.from(v.host.querySelectorAll(".alignment-links > li"));
    expect(cards.map((c) => c.querySelector(".alignment-label")!.textContent)).toEqual(["Calculus I", "Real Analysis", NO_LABEL]);
    expect(Array.from(cards[0].querySelectorAll(".alignment-facts div")).map((d) => d.textContent)).toEqual(["CodeMATH 101", "Levelgraduate", "Course or frameworkExample University", "Score0.810", "Relationbroader"]);
    expect(cards[0].querySelector("details.fine")!.textContent).toBe("How it was proposedembedding+rule");
    expect(Array.from(cards[2].querySelectorAll(".alignment-facts div")).map((d) => d.textContent).slice(0, 3)).toEqual(["CodeHS.F.1", "Levelgraduate", "Course or frameworka-closed-system"]);
    expect(Array.from(cards[0].querySelectorAll(".alignment-actions button")).map((b) => b.textContent)).toEqual(["Right", "Partly", "Wrong"]);
    await v.click(press(cards[2], "Open the source"));
    expect(f.calls).toContain("open https://example.org/k1");
    await v.unmount();
  });

  test("keys decide a whole atom: right, partly with a reason, wrong, clear, then the next atom, and each decision is saved with the reviewer and the date", async () => {
    const f = fakeApi();
    const v = await pane(f);
    await v.click(press(v.host, "Mathematics"));
    await v.click(v.host.querySelector(".alignment-atoms li button"));
    await v.key("1");
    await v.key("j");
    await v.key("2");
    expect(Array.from(v.host.querySelectorAll(".alignment-reasons button")).map((b) => b.textContent)).toEqual(["A: wrong level", "B: broader", "C: narrower", "D: different topic in the same field"]);
    await v.key("c");
    await v.key("ArrowDown");
    await v.key("3");
    const saved = parseDecisions(f.files[NOTES_PATH]);
    expect(saved.map((d) => [d.link, d.decision, d.reason, d.reviewer, d.at])).toEqual([
      ["align:c1~01-mathematics/limits", "right", null, "Ada Example", today()],
      ["align:c2~01-mathematics/limits", "partly", "narrower", "Ada Example", today()],
      ["align:k1~01-mathematics/limits", "wrong", null, "Ada Example", today()],
    ]);
    expect(f.files[LINKS_PATH]).toBe(LINKS);
    expect(f.calls.filter((c) => c.startsWith("save")).every((c) => c === `save ${NOTES_PATH}`)).toBe(true);
    expect(v.host.querySelector(".alignment-atoms li button")!.textContent).toBe("LimitsDone");
    await v.key("x");
    expect(parseDecisions(f.files[NOTES_PATH]).length).toBe(2);
    await v.key("3");
    await v.key("n");
    expect(v.host.querySelector(".alignment-atom h3")!.textContent).toBe("Series");
    await v.key("1");
    await v.key("n");
    expect(v.host.querySelector(".alignment-atom h3")!.textContent).toBe("Sets");
    await v.key("0");
    expect(parseDecisions(f.files[NOTES_PATH]).map((d) => d.decision)).toEqual(["right", "partly", "wrong", "right", "no-match"]);
    await v.key("0");
    expect(parseDecisions(f.files[NOTES_PATH]).length).toBe(4);
    await v.key("p");
    expect(v.host.querySelector(".alignment-atom h3")!.textContent).toBe("Series");
    expect(v.host.querySelector('[role="status"]')!.textContent).toBe("4 of 5 links decided");
    await v.unmount();
  });

  test("a key pressed inside a text box decides nothing, and no decision is saved before a name is typed", async () => {
    const { NEED_NAME } = await import("./views/Alignment");
    const f = fakeApi();
    const v = await pane(f, "");
    await v.click(press(v.host, "Mathematics"));
    await v.click(v.host.querySelector(".alignment-atoms li button"));
    await v.key("1");
    expect(v.host.querySelector('[role="alert"]')!.textContent).toBe(NEED_NAME);
    expect(f.calls.filter((c) => c.startsWith("save"))).toEqual([]);
    const name = v.host.querySelector('input[type="text"]') as HTMLInputElement;
    await v.act(async () => void name.dispatchEvent(new window.KeyboardEvent("keydown", { key: "1", bubbles: true })));
    expect(f.calls.filter((c) => c.startsWith("save"))).toEqual([]);
    await v.type(name, "Brook‮ Sample");
    expect(window.localStorage.getItem("bucket.review.name")).toBe("Brook Sample");
    await v.key("1");
    expect(parseDecisions(f.files[NOTES_PATH]).map((d) => d.reviewer)).toEqual(["Brook Sample"]);
    await v.unmount();
  });

  test("a link can be added by searching the corpus, and an unmatched atom can be marked as having no match", async () => {
    const f = fakeApi();
    const v = await pane(f);
    await v.click(press(v.host, "Mathematics"));
    await v.click(v.host.querySelectorAll(".alignment-atoms li button")[2]);
    expect(v.host.textContent).toContain("No link is proposed for this atom.");
    const box = v.host.querySelector('input[type="search"]') as HTMLInputElement;
    await v.type(box, "set");
    await v.act(async () => void box.form!.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })));
    await v.settle();
    expect(f.calls).toContain("search 01-mathematics set");
    expect(Array.from(v.host.querySelectorAll(".alignment-hits li")).map((li) => li.textContent)).toEqual(["Set TheoryMATH 105, undergraduate-lower, Sample CollegeAdd this link"]);
    await v.click(press(v.host, "Add this link"));
    expect(parseDecisions(f.files[NOTES_PATH]).map((d) => [d.atom, d.decision, d.row, d.link])).toEqual([["atom:01-mathematics/sets", "added", "x9", null]]);
    expect(v.host.querySelector(".alignment-added li")!.textContent).toBe("Set Theory Remove");
    expect(v.host.querySelectorAll(".alignment-atoms li button")[2].textContent).toBe("SetsDone");
    await v.click(press(v.host, "Remove"));
    await v.click(press(v.host, "No match exists"));
    expect(parseDecisions(f.files[NOTES_PATH]).map((d) => d.decision)).toEqual(["no-match"]);
    await v.unmount();
  });

  test("the prerequisite queue filter keeps the atoms at either end of a queued edge", async () => {
    const f = fakeApi();
    const v = await pane(f);
    await v.click(press(v.host, "Mathematics"));
    const select = v.host.querySelector("select") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(["Every atom", "Prerequisite queue, first", "Prerequisite queue, second"]);
    await v.act(async () => {
      select.value = "review-first";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    await v.settle();
    expect(Array.from(v.host.querySelectorAll(".alignment-atoms li span:first-child")).map((s) => s.textContent)).toEqual(["Limits", "Series"]);
    await v.act(async () => {
      select.value = "review-second";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    await v.settle();
    expect(v.host.querySelector(".alignment-atoms p.muted")!.textContent).toBe("No atom of this deck is in that queue.");
    await v.unmount();
  });

  test("a decision is saved at once, so leaving right after a key loses nothing", async () => {
    const f = fakeApi();
    const v = await pane(f);
    await v.click(press(v.host, "Mathematics"));
    await v.click(v.host.querySelector(".alignment-atoms li button"));
    await v.act(async () => void v.host.querySelector(".alignment")!.dispatchEvent(new window.KeyboardEvent("keydown", { key: "1", bubbles: true })));
    await v.unmount();
    await new Promise((r) => setTimeout(r, 0));
    expect(parseDecisions(f.files[NOTES_PATH]).map((d) => [d.link, d.decision])).toEqual([["align:c1~01-mathematics/limits", "right"]]);
    const again = await pane(fakeApi(f.files[NOTES_PATH]));
    expect(again.host.querySelector('[role="status"]')!.textContent).toBe("1 of 5 links decided");
    await again.unmount();
  });

  test("export rebuilds the table from the shipped copy, verifies the rows marked right, and uses the export of the Research screen", async () => {
    const f = fakeApi();
    const v = await pane(f);
    expect((press(v.host, "Export the review") as HTMLButtonElement).disabled).toBe(true);
    await v.click(press(v.host, "Mathematics"));
    await v.click(v.host.querySelector(".alignment-atoms li button"));
    await v.key("1");
    await v.key("j");
    await v.key("3");
    f.calls.length = 0;
    await v.click(press(v.host, "Export the review"));
    expect(f.calls).toEqual([`save ${LINKS_PATH}`, "export"]);
    const rows = f.files[LINKS_PATH].trim().split("\n").map((l) => JSON.parse(l) as { id: string; verified: boolean; verification: { status: string; by: string; at: string } });
    expect(rows.filter((r) => r.verified).map((r) => [r.id, r.verification.status, r.verification.by, r.verification.at])).toEqual([["align:c1~01-mathematics/limits", "verified", "Ada Example", today()]]);
    expect(v.host.querySelector(".alignment-export p")!.textContent).toBe("Exported. 1 link is marked verified in the copy, each with your name and the date.");
    expect(Array.from(v.host.querySelectorAll(".alignment-export li")).map((li) => li.textContent)).toEqual(["CHANGES.patch", LINKS_PATH, NOTES_PATH]);
    await v.key("x");
    await v.key("k");
    await v.key("3");
    f.calls.length = 0;
    await v.click(press(v.host, "Export the review"));
    expect(f.calls).toEqual([`save ${NOTES_PATH}`, `revert ${LINKS_PATH}`, "export"].filter((c) => c !== `save ${NOTES_PATH}`));
    expect(f.files[LINKS_PATH]).toBe(LINKS);
    expect(v.host.querySelector(".alignment-export p")!.textContent).toContain("0 links are marked verified");
    await v.unmount();
  });

  test("the queue opens inside the Graphs workspace at its own address, with Graphs lit, and Back from it returns to the list", async () => {
    const { Screen } = await import("./nav");
    const { REVIEW_KEY, setKey } = await import("./views/Workspace");
    expect(setKey(REVIEW_SLUG)).toBe(REVIEW_KEY);
    expect(parseHash(`#/workspace/graphs/${REVIEW_SLUG}`)).toEqual({ name: "workspace", type: "graphs", item: REVIEW_SLUG });
    const f = fakeApi();
    const item = { type: "graphs", key: REVIEW_KEY, title: "Atom alignment, review queue", from: { kind: "output", id: REVIEW_SLUG, title: "Atom alignment, review queue" }, origin: "staff", licence: "", changed: false, opens: `#/workspace/graphs/${REVIEW_SLUG}`, explore: null };
    const api = { ...f.api, workspaceItems: async () => ({ items: [item], total: 1, page: 1, size: 50 }) } as unknown as Api;
    window.localStorage.setItem("bucket.review.name", "Ada Example");
    window.location.hash = "#/workspace/graphs";
    const v = await mount(<Screen api={api} route={parseHash("#/workspace/graphs")} />);
    expect(v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Graphs");
    await v.click(press(v.host, "Atom alignment, review queue"));
    expect(v.host.querySelector(".alignment-decks")).not.toBeNull();
    expect(Array.from(v.host.querySelectorAll('.tabs [role="tab"]')).map((t) => t.textContent)).toEqual(["All graphs", "Atom alignment, review queue"]);
    window.history.replaceState({}, "");
    await v.act(async () => void window.dispatchEvent(new window.Event("popstate")));
    await v.settle();
    expect(v.host.querySelector(".alignment")).toBeNull();
    expect(v.host.querySelector(".workspace-list")).not.toBeNull();
    await v.unmount();
    const direct = await mount(<Screen api={api} route={parseHash(`#/workspace/graphs/${REVIEW_SLUG}`)} />);
    expect(direct.host.querySelector(".alignment-decks")).not.toBeNull();
    await direct.unmount();
    window.location.hash = "";
  });
});
