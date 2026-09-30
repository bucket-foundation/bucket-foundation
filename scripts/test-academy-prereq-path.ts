import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { closureOf, graphFromAtoms, planPath, repairMastery, type PrereqGraph } from "../src/lib/academy/prereq-path";

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL", msg);
  }
}

function graphOf(parents: Record<number, number[]>): Map<string, string[]> {
  return new Map(Object.entries(parents).map(([k, v]) => [k, v.map(String)]));
}

function stateDistance(graph: PrereqGraph, target: string, mastery: ReadonlySet<string>): number | null {
  const ids = Array.from(graph.keys());
  const bit = new Map(ids.map((id, i) => [id, 1 << i]));
  const need = ids.map((id) => (graph.get(id) ?? []).reduce((m, p) => m | bit.get(p)!, 0));
  const start = Array.from(mastery).reduce((m, v) => m | bit.get(v)!, 0);
  const tb = bit.get(target)!;
  const seen = new Set([start]);
  let frontier = [start];
  for (let d = 0; frontier.length; d++) {
    const next: number[] = [];
    for (const known of frontier) {
      if (known & tb) return d;
      ids.forEach((_, i) => {
        if (known & (1 << i) || (need[i] & known) !== need[i]) return;
        const k = known | (1 << i);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(k);
        }
      });
    }
    frontier = next;
  }
  return null;
}

function exhaustive() {
  let dags = 0, cases = 0, distErr = 0, readyErr = 0, inclErr = 0, repairCases = 0;
  for (let n = 1; n <= 5; n++) {
    const edges: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push([i, j]);
    for (let bits = 0; bits < 1 << edges.length; bits++) {
      dags++;
      const parents: Record<number, number[]> = {};
      for (let i = 0; i < n; i++) parents[i] = [];
      edges.forEach(([p, v], k) => { if (bits & (1 << k)) parents[v].push(p); });
      const g = graphOf(parents);
      for (let mask = 0; mask < 1 << n; mask++) {
        const mastery = new Set<string>();
        for (let v = 0; v < n; v++) if (mask & (1 << v)) mastery.add(String(v));
        const closed = Array.from(mastery).every((v) => g.get(v)!.every((p) => mastery.has(p)));
        for (let t = 0; t < n; t++) {
          const target = String(t);
          if (!closed) {
            const r = planPath(g, target, mastery);
            const rep = repairMastery(g, target, mastery);
            const again = planPath(g, target, rep.mastered);
            check(again.ok, `repair leaves conflict n=${n} bits=${bits} mask=${mask} t=${t}`);
            check(rep.demoted.every((v) => mastery.has(v)), "repair only demotes mastered nodes");
            if (r.ok) check(rep.demoted.length === 0, "repair is a no-op on a locally closed target");
            if (again.ok) {
              const cl = new Set(again.closure);
              const restricted = new Map(Array.from(g).filter(([k]) => cl.has(k)).map(([k, v]) => [k, v] as [string, string[]]));
              const rm = new Set(Array.from(rep.mastered).filter((v) => cl.has(v)));
              check(again.steps.length === stateDistance(restricted, target, rm), "repaired plan is minimal on restricted graph");
            }
            repairCases++;
            continue;
          }
          const r = planPath(g, target, mastery);
          if (!r.ok) {
            check(false, `unexpected error ${r.error.kind}`);
            continue;
          }
          const closure = new Set((closureOf(g, target) as { nodes: string[] }).nodes);
          distErr += Number(r.steps.length !== stateDistance(g, target, mastery));
          const expected = Array.from(closure).filter((v) => !mastery.has(v)).sort();
          inclErr += Number(JSON.stringify(Array.from(r.steps).sort()) !== JSON.stringify(expected));
          const known = new Set(mastery);
          for (const v of r.steps) {
            readyErr += Number(!g.get(v)!.every((p) => known.has(p)));
            known.add(v);
          }
          cases++;
        }
      }
    }
  }
  check(dags === 1099, `dags ${dags}`);
  check(cases === 57060, `cases ${cases}`);
  check(distErr === 0 && readyErr === 0 && inclErr === 0, `errors dist=${distErr} ready=${readyErr} incl=${inclErr}`);
  console.log(`exhaustive: ${dags} DAGs, ${cases} cases, ${repairCases} repair cases`);
}

function fixtures() {
  const diamond = { 0: [], 1: [0], 2: [0], 3: [1, 2], 4: [] };
  const plan = (p: Record<number, number[]>, t: number, m: number[]) => planPath(graphOf(p), String(t), new Set(m.map(String)));

  const d = plan(diamond, 3, []);
  check(d.ok && d.steps.join() === "0,1,2,3", "diamond_disconnected");
  const s = plan({ 0: [], 1: [0], 2: [0, 1] }, 2, []);
  check(s.ok && s.steps.join() === "0,1,2", "shortcut");
  const mt = plan(diamond, 3, [0, 1, 2, 3]);
  check(mt.ok && mt.steps.length === 0, "mastered_target");
  const ur = plan({ 0: [] }, 0, []);
  check(ur.ok && ur.steps.join() === "0", "unmastered_root");
  const cy = plan({ 0: [1], 1: [0] }, 1, []);
  check(!cy.ok && cy.error.kind === "Cycle", "cycle");
  const mc = plan(diamond, 3, [3]);
  check(!mc.ok && mc.error.kind === "MasteryConflict" && mc.error.conflicts[0].id === "3", "mastery_conflict");
  const rep = repairMastery(graphOf(diamond), "3", new Set(["3"]));
  check(rep.demoted.join() === "3" && rep.mastered.size === 0, "mastery_conflict repair");
  const mn = planPath(new Map([["0", ["1"]]]), "0", new Set());
  check(!mn.ok && mn.error.kind === "MissingNode" && mn.error.id === "1", "missing_node");
  const mnt = planPath(new Map(), "x", new Set());
  check(!mnt.ok && mnt.error.kind === "MissingNode", "missing target");
  const dj = plan({ 0: [], 1: [0], 2: [0], 3: [1, 2], 4: [], 5: [4] }, 3, [5]);
  check(dj.ok && dj.steps.join() === "0,1,2,3" && dj.mastered.length === 0, "unrelated_inconsistent_mastery");
  const dj2 = plan({ 0: [], 1: [0], 2: [0], 3: [1, 2], 4: [], 5: [] }, 3, [5, 1]);
  check(!dj2.ok && dj2.error.kind === "MasteryConflict", "local conflict inside closure");
  const ranked = planPath(graphOf({ 0: [], 1: [], 2: [0, 1] }), "2", new Set(), (id) => (id === "1" ? 0 : 1));
  check(ranked.ok && ranked.steps.join() === "1,0,2", "rank orders ties");
}

function corpus() {
  const dir = join(__dirname, "..", "learning", "app", "corpus");
  const atoms: { id: string; requires?: string[] }[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json") || f === "index.json") continue;
    const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (Array.isArray(j.atoms)) atoms.push(...j.atoms);
  }
  const g = graphFromAtoms(atoms);
  let bad = 0;
  for (const id of Array.from(g.keys())) {
    const r = planPath(g, id, new Set());
    if (!r.ok) {
      bad++;
      console.error("corpus", id, r.error);
      continue;
    }
    check(r.steps[r.steps.length - 1] === id, `corpus target last ${id}`);
  }
  check(bad === 0, `corpus planning failures ${bad}`);
  console.log(`corpus: ${g.size} atoms planned`);
}

exhaustive();
fixtures();
corpus();
if (failures) {
  console.error(`${failures} failures`);
  process.exit(1);
}
console.log("prereq-path: ok");
