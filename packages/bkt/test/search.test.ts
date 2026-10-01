import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import canonJson from "../content/canon.json" with { type: "json" };
import { canonRoutes, CanonStore, syncCanon } from "../src/canon";
import { jsonBody } from "../src/cli/out";
import { excerptText, packCanon, searchCanon, searchParams, searchText, searchTsv, showExcerpt } from "../src/core/search";
import type { CanonPack } from "../src/pack/canon";

const CLI = join(import.meta.dir, "../src/cli.tsx");
const real = canonJson as unknown as CanonPack;

const passage = (title: string, text: string, url: string | null) => ({ score: 0.9, kind: "talk", source_path: "sources/talks/one.md", text, url, title, author: "A. Speaker" });
const fixture = {
  version: "fixture",
  sha256: "",
  source: "",
  licences: [],
  counts: {},
  excerpts: [
    { rowid: 7, branch: "02-physics", concept: "speed-of-light", slug: "light-one", title: "Light keeps one speed", text: "light travels at one speed for every observer; light is fast", path: "a.md", source: {} },
    { rowid: 9, branch: "05-biophysics", concept: "water", slug: "water-light", title: "Water absorbs light", text: "water absorbs red light", path: "b.md", source: {} },
    { rowid: 11, branch: "01-mathematics", concept: "sets", slug: "sets", title: "Sets", text: "a set holds members", path: "c.md", source: {} },
  ],
  evidence: { "7": [passage("Relativity lecture", "the speed of light\nis constant", "https://www.youtube.com/watch?v=x")], "9": [] },
} as unknown as CanonPack;

describe("core search", () => {
  const src = packCanon(fixture);

  test("ranks by matched words, drops zero scores and keeps the branch filter", () => {
    const r = searchCanon(src, searchParams("light"));
    expect(r.ok && r.results.map((h) => [h.id, h.score, h.evidence])).toEqual([
      [7, 2, 1],
      [9, 1, 0],
    ]);
    const b = searchCanon(src, searchParams("light", { branch: "05-biophysics" }));
    expect(b.ok && b.results.map((h) => h.id)).toEqual([9]);
    const none = searchCanon(src, searchParams("zzzz"));
    expect(none.ok && none.results).toEqual([]);
    expect(searchCanon(packCanon({ ...fixture, excerpts: [] }), searchParams("light")).ok).toBe(false);
  });

  test("text, tab separated rows and the JSON body match their golden forms", () => {
    const r = searchCanon(src, searchParams("light", { limit: 2 }));
    if (!r.ok) throw new Error("expected results");
    expect(searchText(r.results)).toBe("7  Light keeps one speed  (physics, 1 passage)\n9  Water absorbs light  (biophysics, 0 passages)");
    expect(searchTsv(r.results)).toBe(
      "7\t2.000\t02-physics\tLight keeps one speed\t1\thttps://bucket.foundation/excerpts/speed-of-light/light-one\n" +
        "9\t1.000\t05-biophysics\tWater absorbs light\t0\thttps://bucket.foundation/excerpts/water/water-light",
    );
    expect(JSON.stringify(jsonBody("search", { query: "light", mode: r.mode, results: r.results.slice(0, 1) }))).toBe(
      '{"v":1,"query":"light","mode":"lexical","results":[{"id":7,"branch":"02-physics","concept":"speed-of-light","title":"Light keeps one speed","score":2,"url":"https://bucket.foundation/excerpts/speed-of-light/light-one","excerpt":"light travels at one speed for every observer; light is fast","evidence":1}]}',
    );
  });

  test("canon show prints the excerpt with its evidence and its JSON leaves out source files", () => {
    const e = showExcerpt(src, 7)!;
    expect(excerptText(e)).toBe(
      [
        "Light keeps one speed",
        "physics",
        "",
        "light travels at one speed for every observer; light is fast",
        "",
        "Evidence:",
        "",
        "1. Relativity lecture, A. Speaker",
        "   the speed of light is constant",
        "   https://www.youtube.com/watch?v=x",
        "",
        "https://bucket.foundation/excerpts/speed-of-light/light-one",
      ].join("\n"),
    );
    expect(JSON.stringify(jsonBody("canon show", e))).toBe(
      '{"v":1,"id":7,"branch":"02-physics","concept":"speed-of-light","title":"Light keeps one speed","text":"light travels at one speed for every observer; light is fast","url":"https://bucket.foundation/excerpts/speed-of-light/light-one","evidence":[{"title":"Relativity lecture","author":"A. Speaker","kind":"talk","url":"https://www.youtube.com/watch?v=x","score":0.9,"text":"the speed of light\\nis constant"}]}',
    );
    expect(showExcerpt(src, 8)).toBeNull();
    expect(excerptText(showExcerpt(src, 9)!)).toContain("No evidence passages.");
  });

  test("the window route and the command line rank the shipped canon the same way", async () => {
    const db = new Database(":memory:");
    db.run("create table meta (k text primary key, v text not null)");
    syncCanon(db, real);
    const route = canonRoutes(new CanonStore(db))["GET /local/canon/search"];
    for (const q of ["light", "entropy information", "water structure", "quantum field theory"]) {
      const url = new URL(`http://127.0.0.1/local/canon/search?q=${encodeURIComponent(q)}&top_k=20`);
      const body = (await (await route(new Request(url), url)).json()) as { results: { claim_id: number; score: number }[] };
      const core = searchCanon(packCanon(real), searchParams(q, { limit: 20 }));
      expect(core.ok && core.results.map((h) => [h.id, h.score])).toEqual(body.results.map((r) => [r.claim_id, r.score]));
    }
    db.close();
  });
});

let dir: string;
let env: Record<string, string>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-search-"));
  env = { PATH: join(dir, "bin"), HOME: join(dir, "user"), BKT_HOME: join(dir, "data"), XDG_RUNTIME_DIR: join(dir, "run"), DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent/bkt-test-bus" };
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function bkt(args: string[]) {
  const r = Bun.spawnSync([process.execPath, CLI, ...args], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

describe("bkt search and bkt canon show", () => {
  test("print text, JSON and tab separated rows from the bundled canon and write nothing", () => {
    const text = bkt(["search", "speed", "of", "light", "--limit", "3"]);
    expect(text.code).toBe(0);
    expect(text.out.trimEnd().split("\n")).toHaveLength(3);
    const json = bkt(["search", "light", "--limit", "2", "--json"]);
    const body = JSON.parse(json.out) as { v: number; query: string; results: Record<string, unknown>[] };
    expect([body.v, body.query, body.results.length]).toEqual([1, "light", 2]);
    expect(Object.keys(body.results[0])).toEqual(["id", "branch", "concept", "title", "score", "url", "excerpt", "evidence"]);
    const tsv = bkt(["search", "light", "--limit", "4", "--tsv"]);
    const rows = tsv.out.trimEnd().split("\n").map((l) => l.split("\t"));
    expect(rows.map((r) => r.length)).toEqual([6, 6, 6, 6]);
    expect(rows.slice(0, 2).map((r) => Number(r[0]))).toEqual(body.results.map((r) => r.id as number));
    const show = bkt(["canon", "show", rows[0][0], "--json"]);
    expect(show.code).toBe(0);
    const shown = JSON.parse(show.out) as { v: number; id: number; evidence: Record<string, unknown>[] };
    expect([shown.v, shown.id]).toEqual([1, Number(rows[0][0])]);
    expect(show.out).not.toContain("source_path");
    const plain = bkt(["canon", "show", rows[0][0]]);
    expect(plain.out.split("\n")[0]).toBe(rows[0][3]);
    expect(existsSync(env.BKT_HOME)).toBe(false);
  }, 60_000);

  test("exit 3 for no match or no such excerpt, exit 2 for usage errors", () => {
    expect(bkt(["search", "zzzqqqxx"])).toEqual({ code: 3, out: "", err: "bkt: nothing in the canon matches zzzqqqxx\n" });
    expect(bkt(["search", "zzzqqqxx", "--json"]).code).toBe(3);
    expect(bkt(["canon", "show", "999999999"]).code).toBe(3);
    for (const args of [["search"], ["search", "x", "--limit", "0"], ["search", "x", "--limit", "51"], ["search", "x", "--json", "--tsv"], ["canon", "show", "abc"], ["canon", "show"], ["canon"]]) {
      const r = bkt(args);
      expect([args.join(" "), r.code, r.out]).toEqual([args.join(" "), 2, ""]);
    }
    expect(existsSync(env.BKT_HOME)).toBe(false);
  }, 60_000);

  test("help names both commands with their flags", () => {
    const help = bkt(["help"]).out;
    expect(help).toContain("  search <words>");
    expect(help).toContain("  canon show <number>");
    const one = bkt(["help", "search"]).out;
    for (const flag of ["--limit N", "--branch BRANCH", "--tsv", "--json"]) expect(one).toContain(flag);
  });
});

const PTY = process.platform !== "win32" && Bun.semver.satisfies(Bun.version, ">=1.3.5");

describe.if(PTY)("the terminal app in a pseudo terminal", () => {
  test("tab keys move between screens and / searches as you type", async () => {
    let out = "";
    const proc = Bun.spawn([process.execPath, CLI, "--keyring", "passphrase"], {
      env: { ...env, TERM: "xterm-256color" },
      terminal: {
        cols: 100,
        rows: 50,
        data(_t, d) {
          out += new TextDecoder().decode(d);
        },
      },
    });
    const plain = () => out.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, "");
    const until = async (needle: string) => {
      for (let i = 0; i < 100 && !plain().includes(needle); i++) await Bun.sleep(100);
      return plain().includes(needle);
    };
    const send = async (keys: string, needle: string) => {
      const from = out.length;
      proc.terminal!.write(keys);
      for (let i = 0; i < 100 && !out.slice(from).replace(/\u001b\[[0-9;?]*[A-Za-z]/g, "").includes(needle); i++) await Bun.sleep(100);
      return out.slice(from).replace(/\u001b\[[0-9;?]*[A-Za-z]/g, "");
    };
    try {
      expect(await until("passphrase")).toBe(true);
      proc.terminal!.write("pw\r");
      expect(await until("1 Search")).toBe(true);
      expect(await send("2", "No graph in this pack yet.")).toContain("No graph in this pack yet.");
      expect(await send("4", "No notes yet.")).toContain("No saved results yet.");
      expect(await send("\t", "No saved analyses yet.")).toContain("No saved analyses yet.");
      expect(await send("1", "Type to search")).toContain("Type to search the canon.");
      expect(await send("light", "enter or esc")).toContain("light");
      expect(await send("\r", "j/k move")).toContain("enter details");
      expect(await send("\r", "Evidence")).toContain("Evidence");
      expect(await send("y", "Copied excerpt number")).toContain("Copied excerpt number");
    } finally {
      proc.kill();
      await proc.exited;
    }
  }, 60_000);
});
