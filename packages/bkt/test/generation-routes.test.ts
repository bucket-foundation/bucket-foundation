import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generatedFigures, generationRoutes, generationRows } from "../src/generation-routes";
import { workspaceItems, type WorkspaceSources } from "../src/workspace";

let repo: string;
let home: string;
const RUN = "20261019T101500-0a1b2c3d";

function record(name: string, run: string, outputs: string[], params: Record<string, string> = {}) {
  const dir = join(home, "generations", name, run);
  mkdirSync(dir, { recursive: true });
  for (const o of outputs) writeFileSync(join(dir, o), o.endsWith(".svg") ? "<svg xmlns='http://www.w3.org/2000/svg'/>" : "png");
  writeFileSync(join(dir, `${name}.run.json`), JSON.stringify({ name, params, script_sha256: "", data_sha256: {}, outputs, created: "2026-10-19T10:15:00Z", needs: [] }));
  return dir;
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "bkt-genr-repo-"));
  home = mkdtempSync(join(tmpdir(), "bkt-genr-home-"));
  mkdirSync(join(repo, "tools/generations"), { recursive: true });
  writeFileSync(join(repo, "tools/generations/a.py"), "a");
  writeFileSync(join(repo, "tools/generations/registry.json"), JSON.stringify({ version: 1, generations: [
    { name: "glyph", script: "a.py", about: "A glyph", inputs: { problem: "id" }, data: [], outputs: ["{problem}-glyph.svg"] },
    { name: "paper", script: "a.py", about: "A paper figure", inputs: {}, data: [], outputs: ["fig.pdf"] },
  ] }));
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

const get = (routes: ReturnType<typeof generationRoutes>, path: string) => {
  const url = new URL(`http://127.0.0.1${path}`);
  return routes[`GET ${url.pathname}`](new Request(url), url, { cli: false });
};

test("rows list every render with its command and its last run", () => {
  record("glyph", "20261018T090000-11111111", ["navier-glyph.svg"], { problem: "navier" });
  record("glyph", RUN, ["riemann-glyph.svg"], { problem: "riemann" });
  const rows = generationRows({ home, repo });
  expect(rows.map((r) => [r.name, r.command, r.last?.run ?? null])).toEqual([
    ["glyph", "bkt generate glyph --problem ...", RUN],
    ["paper", "bkt generate paper", null],
  ]);
});

test("the figures workspace lists the image outputs of each last run", () => {
  record("glyph", RUN, ["riemann-glyph.svg"], { problem: "riemann" });
  record("paper", RUN, ["fig.pdf"]);
  const items = generatedFigures({ home, repo });
  expect(items.map((i) => [i.key, i.title, i.origin, i.from.kind])).toEqual([[`generated:glyph:${RUN}:riemann-glyph.svg`, "riemann-glyph.svg, riemann", "local", "generation"]]);
  const src: WorkspaceSources = { research: { list: () => [], detail: () => { throw new Error("none"); } }, changedPaths: () => [], datasets: () => [], rowSets: () => [], generated: () => items };
  expect(workspaceItems(src, "figures")).toEqual(items);
  expect(workspaceItems(src, "papers")).toEqual([]);
});

test("without a checkout the rows still show past runs", () => {
  record("glyph", RUN, ["riemann-glyph.svg"]);
  expect(generationRows({ home, repo: null }).map((r) => [r.name, r.about])).toEqual([["glyph", ""]]);
});

test("the file route serves a listed image and refuses everything else", async () => {
  const dir = record("glyph", RUN, ["riemann-glyph.svg"], { problem: "riemann" });
  writeFileSync(join(dir, "other.png"), "png");
  symlinkSync("/etc/hostname", join(dir, "link.svg"));
  const routes = generationRoutes({ home, repo });
  const ok = await get(routes, `/local/generations/file?name=glyph&run=${RUN}&file=riemann-glyph.svg`);
  expect([ok.status, ok.headers.get("content-type"), ok.headers.get("content-security-policy")?.startsWith("default-src 'none'")]).toEqual([200, "image/svg+xml", true]);
  expect((await get(routes, `/local/generations/file?name=glyph&run=${RUN}&file=other.png`)).status).toBe(404);
  expect((await get(routes, `/local/generations/file?name=glyph&run=${RUN}&file=..%2Fx.svg`)).status).toBe(400);
  expect((await get(routes, `/local/generations/file?name=glyph&run=${RUN}&file=glyph.run.json`)).status).toBe(400);
  expect((await get(routes, `/local/generations/file?name=..&run=${RUN}&file=a.svg`)).status).toBe(400);
  const list = await (await get(routes, "/local/generations")).json();
  expect(list.generations.length).toBe(2);
});

test("a listed output that is a link is refused", async () => {
  const dir = record("glyph", RUN, []);
  symlinkSync("/etc/hostname", join(dir, "link.svg"));
  writeFileSync(join(dir, "glyph.run.json"), JSON.stringify({ name: "glyph", params: {}, outputs: ["link.svg"], created: "", needs: [] }));
  expect((await get(generationRoutes({ home, repo }), `/local/generations/file?name=glyph&run=${RUN}&file=link.svg`)).status).toBe(400);
});
