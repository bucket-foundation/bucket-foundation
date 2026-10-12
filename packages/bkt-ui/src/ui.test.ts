import { describe, expect, test } from "bun:test";
import { WORKSPACE_TYPES, EXPLORE_MODE_IDS, firstRunHash, followRoutes, href, parseHash, RESEARCH_TABS, type Route } from "./router";
import { MODES } from "../../../src/lib/explore/modes";
import { validDatasetId } from "../../../src/lib/explore/datasets";
import { blocks } from "./views/Lesson";

describe("hash router", () => {
  test("parses every view and round trips", () => {
    expect(parseHash("")).toEqual({ name: "learn" });
    expect(parseHash("#/quiz")).toEqual({ name: "quiz" });
    expect(parseHash("#/review")).toEqual({ name: "review" });
    expect(parseHash("#/import")).toEqual({ name: "import" });
    expect(parseHash("#/learn/05-biophysics")).toEqual({ name: "deck", deck: "05-biophysics" });
    expect(parseHash(href({ name: "deck", deck: "a b" }))).toEqual({ name: "deck", deck: "a b" });
    expect(parseHash("#/nope")).toEqual({ name: "learn" });
    expect(parseHash("#/learn/02-physics/entropy")).toEqual({ name: "deck", deck: "02-physics", atom: "entropy" });
    expect(parseHash("#/path")).toEqual({ name: "path" });
    expect(parseHash(href({ name: "path", to: "first law" }))).toEqual({ name: "path", to: "first law" });
    expect(parseHash("#/work")).toEqual({ name: "work" });
    expect(parseHash("#/work/daily/2026-09-30")).toEqual({ name: "daily", day: "2026-09-30" });
    expect(href({ name: "daily", day: "2026-09-30" })).toBe("#/work/daily/2026-09-30");
    for (const bad of ["2026-02-30", "2026-13-01", "today", "2026-9-3", "2026-09-30/extra", "..%2F..%2Fetc", "%3Cscript%3E", ""]) expect(parseHash(`#/work/daily/${bad}`)).toEqual({ name: "work" });
    for (const broken of ["#/work/daily/%", "#/%E0%A4%A", "#/learn/%zz", "#/path/%"]) expect(parseHash(broken)).toEqual({ name: "learn" });
    expect(parseHash("#/work/other/2026-09-30")).toEqual({ name: "work" });
    for (const n of ["advisors", "primes", "jobs"] as const) expect(parseHash(`#/${n}`)).toEqual({ name: n });
  });
});

describe("explore, workspace and research item routes", () => {
  const roundTrips = (r: Route) => expect(parseHash(href(r))).toEqual(r);

  test("the router mode ids are the mode ids Explore draws", () => {
    expect(MODES.map((m) => m.id)).toEqual([...EXPLORE_MODE_IDS]);
  });

  test("explore carries a data set, a mode and a selected row", () => {
    expect(parseHash("#/explore")).toEqual({ name: "explore" });
    expect(href({ name: "explore" })).toBe("#/explore");
    expect(parseHash("#/explore/major-to-career")).toEqual({ name: "explore", data: "major-to-career" });
    expect(parseHash("#/explore/major-to-career/graph")).toEqual({ name: "explore", data: "major-to-career", mode: "graph" });
    expect(href({ name: "explore", data: "occupations-time", mode: "map", sel: "row:occupations-time:soc-15" })).toBe("#/explore/occupations-time/map/row%3Aoccupations-time%3Asoc-15");
    expect(parseHash("#/explore/occupations-time/map/row:occupations-time:soc-15")).toEqual({ name: "explore", data: "occupations-time", mode: "map", sel: "row:occupations-time:soc-15" });
    for (const mode of EXPLORE_MODE_IDS) roundTrips({ name: "explore", data: "canon", mode });
    roundTrips({ name: "explore", data: "a" });
    roundTrips({ name: "explore", data: "a".repeat(64), mode: "timeline", sel: `row:${"a".repeat(64)}:${"K".repeat(160)}` });
    roundTrips({ name: "explore", data: "cip-coverage", mode: "map", sel: "row:cip-coverage:11.07_a-b.c" });
    expect(href({ name: "explore", sel: "row:a:b" })).toBe("#/explore");
    expect(href({ name: "explore", data: "a", sel: "row:a:b" })).toBe("#/explore/a");
  });

  test("a bad explore part falls back to the plain explore route", () => {
    const bad = [
      "Major", "-lead", "a".repeat(65), "a_b", "..%2F..%2Fetc", "%3Cscript%3E",
      "canon/nope", "canon/Graph", "canon/graph/extra", "canon/graph/row:canon", "canon/graph/row:Canon:x", "canon/graph/row:canon:a%2Fb", "canon/graph/row:canon:a b",
      `canon/graph/row:canon:${"k".repeat(161)}`, `canon/graph/row:${"a".repeat(65)}:k`, "canon/graph/row:canon:k/more", "canon/graph/atom:canon:k",
    ];
    for (const part of bad) expect(parseHash(`#/explore/${part}`)).toEqual({ name: "explore" });
    expect(parseHash("#/explore/%")).toEqual({ name: "learn" });
  });

  test("the data part follows the data set id rule", () => {
    for (const id of ["canon", "sample", "occupations-time", "a", "0-9", "Major", "-x", "a.b", "a".repeat(64), "a".repeat(65)]) {
      expect(parseHash(`#/explore/${id}`)).toEqual(validDatasetId(id) ? { name: "explore", data: id } : { name: "explore" });
    }
  });

  test("a workspace route names one of eight types and opens tables otherwise", () => {
    expect(WORKSPACE_TYPES).toHaveLength(8);
    for (const type of WORKSPACE_TYPES) {
      expect(parseHash(`#/workspace/${type}`)).toEqual({ name: "workspace", type });
      roundTrips({ name: "workspace", type });
    }
    expect(href({ name: "workspace", type: "maps" })).toBe("#/workspace/maps");
    expect(href({ name: "workspace" })).toBe("#/workspace/tables");
    for (const hash of ["#/workspace", "#/workspace/", "#/workspace/nodes", "#/workspace/Tables", "#/workspace/tables/extra", "#/workspace/figures/x", "#/workspace/..%2F"]) expect(parseHash(hash)).toEqual({ name: "workspace", type: "tables" });
    for (const hash of ["#/desk", "#/desk/tables", "#/desks/tables"]) expect(parseHash(hash)).toEqual({ name: "learn" });
  });

  test("the research hash takes an item as its fourth part", () => {
    expect(parseHash("#/research")).toEqual({ name: "research" });
    expect(parseHash("#/research/atlas")).toEqual({ name: "research", slug: "atlas", tab: "report" });
    expect(href({ name: "research", slug: "atlas" })).toBe("#/research/atlas/report");
    for (const tab of RESEARCH_TABS) {
      roundTrips({ name: "research", slug: "atlas", tab });
      roundTrips({ name: "research", slug: "atlas", tab, item: "fig-1.backtest_v2.png" });
    }
    expect(parseHash("#/research/atlas/figures/coverage.svg")).toEqual({ name: "research", slug: "atlas", tab: "figures", item: "coverage.svg" });
    roundTrips({ name: "research", slug: "atlas", tab: "data", item: "A".repeat(128) });
    for (const hash of [
      "#/research/Atlas", "#/research/atlas/nope", "#/research/atlas/nope/item", "#/research/atlas/figures/.hidden", "#/research/atlas/figures/a%2Fb", "#/research/atlas/figures/a b",
      `#/research/atlas/figures/${"A".repeat(129)}`, "#/research/atlas/figures/a/b", "#/research/atlas/figures/..",
    ]) expect(parseHash(hash)).toEqual({ name: "research" });
  });
});

describe("first run", () => {
  test("sends a new user with no progress to the quiz", () => {
    const fresh = [{ introduced: 0, xp: 0 }, { introduced: 0, xp: 0 }];
    expect(firstRunHash("", fresh)).toBe("#/quiz");
    expect(firstRunHash("#/", fresh)).toBe("#/quiz");
    expect(firstRunHash("#/review", fresh)).toBeNull();
    expect(firstRunHash("", [{ introduced: 3, xp: 0 }])).toBeNull();
    expect(firstRunHash("", [{ introduced: 0, xp: 12 }])).toBeNull();
  });
});

describe("lesson blocks", () => {
  test("splits headings, lists and paragraphs inside one block", () => {
    expect(blocks("### Intuition\nline one\nline two\n\n- a\n- b\ntail")).toEqual([
      { kind: "h", text: "Intuition" },
      { kind: "p", text: "line one line two" },
      { kind: "ul", items: ["a", "b"] },
      { kind: "p", text: "tail" },
    ]);
  });
});

describe("routes sent to an open window", () => {
  test("each route is applied, a failed poll is retried and a refused one ends the loop", async () => {
    const answers: (string | null | Error)[] = ["/notes", null, new Error("offline"), "/work/daily/2026-10-01", Object.assign(new Error("gone"), { status: 401 }), "/quiz"];
    const polls = { n: 0 };
    await followRoutes(async () => (polls.n++, { route: null, superseded: true }), () => polls.n++, () => true);
    expect(polls.n).toBe(1);
    const went: string[] = [];
    const waits: number[] = [];
    await followRoutes(
      async () => {
        const a = answers.shift()!;
        if (a instanceof Error) throw a;
        return { route: a, superseded: false };
      },
      (to) => went.push(to),
      () => true,
      async (ms) => void waits.push(ms),
    );
    expect(went).toEqual(["/notes", "/work/daily/2026-10-01"]);
    expect(waits).toEqual([5000]);
    expect(answers).toEqual(["/quiz"]);
  });
});
