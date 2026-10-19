import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkParams, fill, findRepo, GenerateError, loadRegistry, pastRuns, runFolder, runGeneration, type Registry } from "../src/generate";

const REPO = resolve(import.meta.dir, "../../..");

let repo: string;
let home: string;

const REG: Registry = {
  version: 1,
  generations: [
    { name: "base", script: "base.py", about: "a base", inputs: { problem: "id" }, data: ["data/in.json"], outputs: ["{problem}-base.json"] },
    { name: "card", script: "card.py", about: "a card", inputs: { problem: "id", label: "text" }, needs: ["base"], data: ["data/in.json", "data/missing.json"], outputs: ["card-{problem}.png"] },
  ],
};

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "bkt-gen-repo-"));
  home = mkdtempSync(join(tmpdir(), "bkt-gen-home-"));
  mkdirSync(join(repo, "tools/generations"), { recursive: true });
  mkdirSync(join(repo, "data"));
  writeFileSync(join(repo, "data/in.json"), '{"x":1}');
  writeFileSync(join(repo, "tools/generations/base.py"), "base");
  writeFileSync(join(repo, "tools/generations/card.py"), "card");
  writeFileSync(join(repo, "tools/generations/registry.json"), JSON.stringify(REG));
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

function fakeSpawn(calls: { script: string; env: Record<string, string> }[], write = true) {
  return (cmd: string[], env: Record<string, string>) => {
    calls.push({ script: cmd[1].split("/").pop()!, env });
    if (write) {
      const p = env.BKT_GEN_PROBLEM;
      const file = cmd[1].endsWith("base.py") ? `${p}-base.json` : `card-${p}.png`;
      writeFileSync(join(env.BKT_GEN_OUT, file), "out");
    }
    return { code: 0, stderr: "" };
  };
}

describe("the generation registry in the repository", () => {
  test("every listed generation has its script, a unique name and known needs", () => {
    const reg = loadRegistry(REPO);
    expect(reg.generations.map((g) => g.name)).toEqual(["frontier-figure", "problem-star", "problem-slice", "problem-polygon", "problem-polygon-figure", "frontier-card"]);
    for (const g of reg.generations) for (const o of g.outputs) expect(o).not.toContain("navier");
    expect(findRepo(join(REPO, "packages/bkt/src"))).toBe(REPO);
  });

  test("no generation script names a home folder, a scratch path or a fixed problem", () => {
    for (const g of loadRegistry(REPO).generations) {
      const text = readFileSync(join(REPO, "tools/generations", g.script), "utf8");
      expect(text).not.toMatch(/\/home\/|\/tmp\/|PROBLEM = "/);
    }
  });
});

describe("running a generation", () => {
  test("needs run first into the same folder, inputs reach the script, and the run records its parameters and data hashes", () => {
    const calls: { script: string; env: Record<string, string> }[] = [];
    const out = runFolder(home, "card", { problem: "navier" }, new Date("2026-10-19T12:00:00Z"));
    const rec = runGeneration(loadRegistry(repo), "card", { problem: "navier", label: "Navier-Stokes" }, { repo, out, spawn: fakeSpawn(calls), now: () => new Date("2026-10-19T12:00:00Z") });
    expect(calls.map((c) => c.script)).toEqual(["base.py", "card.py"]);
    expect(calls[0].env).toEqual({ BKT_GEN_OUT: out, BKT_GEN_PROBLEM: "navier" });
    expect(calls[1].env).toEqual({ BKT_GEN_OUT: out, BKT_GEN_PROBLEM: "navier", BKT_GEN_LABEL: "Navier-Stokes" });
    expect(rec.outputs).toEqual(["card-navier.png"]);
    expect(rec.data_sha256["data/in.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(rec.data_sha256["data/missing.json"]).toBeNull();
    expect(rec.needs[0].name).toBe("base");
    const saved = JSON.parse(readFileSync(join(out, "card.run.json"), "utf8"));
    expect(saved.params).toEqual({ problem: "navier", label: "Navier-Stokes" });
    expect(pastRuns(home).map((r) => r.name)).toEqual(["card"]);
    expect(pastRuns(home, "base")).toEqual([]);
  });

  test("an unknown input, an unsafe value, an unknown name and a run that writes nothing are refused", () => {
    const reg = loadRegistry(repo);
    const out = join(home, "x");
    expect(() => checkParams(reg.generations[0], { size: "4" })).toThrow(GenerateError);
    expect(() => checkParams(reg.generations[0], { problem: "x;rm -rf" })).toThrow(GenerateError);
    expect(() => runGeneration(reg, "nope", {}, { repo, out })).toThrow(/no generation named nope/);
    expect(() => runGeneration(reg, "base", { problem: "a" }, { repo, out, spawn: fakeSpawn([], false) })).toThrow(/without writing a-base.json/);
    expect(() => runGeneration(reg, "base", { problem: "a" }, { repo, out, spawn: () => ({ code: 2, stderr: "Traceback\nKeyError: a" }) })).toThrow(/did not finish \(exit 2\)/);
  });

  test("a registry that lists a missing script or an unknown need does not load", () => {
    writeFileSync(join(repo, "tools/generations/registry.json"), JSON.stringify({ version: 1, generations: [{ ...REG.generations[1], needs: ["ghost"] }] }));
    expect(() => loadRegistry(repo)).toThrow(/needs ghost/);
    writeFileSync(join(repo, "tools/generations/registry.json"), JSON.stringify({ version: 1, generations: [{ ...REG.generations[0], script: "gone.py" }] }));
    expect(() => loadRegistry(repo)).toThrow(/not in tools\/generations/);
  });

  test("the run folder is stable for the same inputs and differs for others", () => {
    const at = new Date("2026-10-19T12:00:00Z");
    expect(runFolder(home, "card", { problem: "navier" }, at)).toBe(runFolder(home, "card", { problem: "navier" }, at));
    expect(runFolder(home, "card", { problem: "navier" }, at)).not.toBe(runFolder(home, "card", { problem: "hodge" }, at));
    expect(fill("card-{problem}-{size}.png", { problem: "navier" })).toBe("card-navier-{size}.png");
  });
});
