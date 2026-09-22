/**
 * The staged Research OS queue: every open item with a stage, what it
 * depends on, and what it unlocks, plus the shipped items that carry the
 * dependencies. Read at /research-os/roadmap.
 *
 * Scope: every open Research OS bead in BEADS-PENDING.jsonl, and the
 * shipped beads other rows depend on. A shipped bead that carries no
 * dependency is left out, so the page stays the order of the work ahead.
 *
 * The staging test lives in learning/research-os/ROADMAP.md:
 *   mvp   one researcher runs a whole loop on one machine
 *   near  a second person joins, or the work reaches the public site
 *   later many people, money, or compute somebody else owns
 *
 * An item whose decision is open in docs/FOUNDER-DECISIONS.md cannot sit
 * in mvp, so `blockedBy` never appears on an mvp row. `roadmapProblems`
 * checks both rules, and the page shows what it finds.
 */

export type Stage = "mvp" | "near" | "later";
export type Status = "shipped" | "partial" | "open";
/** Loop passes: s is one or two, m is up to six, l is more. */
export type Cost = "s" | "m" | "l";

export interface RoadmapItem {
  /** The bead name, which is also the id other rows depend on. */
  id: string;
  epic: string;
  /** What the item delivers, in one line. */
  title: string;
  stage: Stage;
  status: Status;
  cost: Cost;
  dependsOn: string[];
  /** Rows of docs/FOUNDER-DECISIONS.md that have to close first. */
  blockedBy?: string[];
  unlocks: string;
}

export const STAGE_LABEL: Record<Stage, string> = {
  mvp: "MVP",
  near: "near-term",
  later: "later",
};

export const STAGE_TEST: Record<Stage, string> = {
  mvp: "One researcher runs a whole loop on one machine: bring material in, find and quote it, see what a node is made of and how well it stands, produce something, have it reviewed.",
  near: "A second person joins the work, or the result reaches the public site.",
  later: "Many people, money moving, or compute somebody else owns.",
};

export const COST_LABEL: Record<Cost, string> = {
  s: "1 to 2 loop passes",
  m: "3 to 6 loop passes",
  l: "more than 6 loop passes",
};

export const ROADMAP: RoadmapItem[] = [
  // ---- shipped, and carrying the dependencies below -------------------
  {
    id: "ros-prime 1",
    epic: "primes",
    title: "Decomposition over the dependency edges: prime signature, penetration, tier",
    stage: "mvp",
    status: "shipped",
    cost: "m",
    dependsOn: [],
    unlocks: "Every made-of view and every tier claim",
  },
  {
    id: "ros-prime 2",
    epic: "primes",
    title: "Decompose-further queue, with model-proposed factors held for human review",
    stage: "mvp",
    status: "shipped",
    cost: "m",
    dependsOn: ["ros-prime 1"],
    unlocks: "Factors for the nodes that had none",
  },
  {
    id: "ros-prime 4a",
    epic: "primes",
    title: "The made-of section on the node page, with the chain behind each shortcut",
    stage: "mvp",
    status: "shipped",
    cost: "s",
    dependsOn: ["ros-prime 1"],
    unlocks: "A reader sees what a node rests on without reading a doc",
  },
  {
    id: "ros-patents 0",
    epic: "patents",
    title: "Patents in Research OS, with the gateway and feed402 findings handed to the org repositories",
    stage: "mvp",
    status: "shipped",
    cost: "m",
    dependsOn: [],
    unlocks: "The patent work split between this repo and the gateway repos",
  },
  {
    id: "ros-patents 1",
    epic: "patents",
    title: "The research memo on patents in discovery and innovation, with the design for Research OS",
    stage: "mvp",
    status: "shipped",
    cost: "l",
    dependsOn: ["ros-patents 0"],
    unlocks: "The CPC slice, the citation model, and the prior-art measure that ros-patents 2 and 3 build",
  },
  {
    id: "ros-builds",
    epic: "platform",
    title: "The Vercel gate that skips a build it should skip, and a pre-push lint and type check",
    stage: "mvp",
    status: "shipped",
    cost: "m",
    dependsOn: [],
    unlocks: "Pushes stop costing failed preview deployments",
  },
  {
    id: "ros-loop host",
    epic: "platform",
    title: "hte-serve as a local user service, so the engine answers on this machine",
    stage: "mvp",
    status: "shipped",
    cost: "s",
    dependsOn: [],
    unlocks: "Hypotheses as frontier targets without a hosted engine",
  },

  // ---- MVP, open -------------------------------------------------------
  {
    id: "ros-truth 1",
    epic: "truth",
    title: "Research memo on source levels, evidence levels, falsifiability and measurement scales, with a proposed schema",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "ros-truth 2 and the truth level in ros-prime 3",
  },
  {
    id: "ros-truth 2",
    epic: "truth",
    title: "Claim provenance on nodes and edges: how a claim is known, its source distance, its data type",
    stage: "mvp",
    status: "open",
    cost: "l",
    dependsOn: ["ros-truth 1"],
    unlocks: "A standing for every claim, and the input the truth level needs",
  },
  {
    id: "ros-prime 3",
    epic: "primes",
    title: "Truth level from the factors, with network analysis naming the load-bearing primes",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: ["ros-prime 1", "ros-truth 2"],
    unlocks: "How well a node stands, beside what it is made of",
  },
  {
    id: "ros-tier-fix",
    epic: "graph",
    title: "Reconcile grade tiers with what nodes rest on",
    stage: "mvp",
    status: "shipped",
    cost: "s",
    dependsOn: ["ros-prime 1"],
    unlocks: "Learning order stops contradicting the factor edges on a shipped surface",
  },
  {
    id: "ros-import 1",
    epic: "imports",
    title: "Data model and private storage for an import of any file type",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "Everything downstream of bringing your own material in",
  },
  {
    id: "ros-import 2",
    epic: "imports",
    title: "Upload any file from the import page, with type detection and metadata",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: ["ros-import 1"],
    unlocks: "A researcher's own books, papers and tables inside the workspace",
  },
  {
    id: "ros-import 3",
    epic: "imports",
    title: "Extraction: text into passages, tables into a column schema with stats",
    stage: "mvp",
    status: "open",
    cost: "l",
    dependsOn: ["ros-import 2"],
    unlocks: "Find, quote and check over imported material",
  },
  {
    id: "research: human-AI-computer work",
    epic: "direction",
    title: "The trajectory from human-computer to human-AI-computer work, and the roles it implies",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "The research program the product argues from, and the words the site will need",
  },
  {
    id: "ros-roadmap",
    epic: "product",
    title: "This staging, and the page that shows it",
    stage: "mvp",
    status: "partial",
    cost: "s",
    dependsOn: [],
    unlocks: "One page that sets the order of everything else",
  },
  {
    id: "ros-frontend",
    epic: "product",
    title: "The gate: a task merges when its result is usable inside Research OS at 1280 and 390",
    stage: "mvp",
    status: "open",
    cost: "s",
    dependsOn: [],
    unlocks: "Results people can use without reading a memo",
  },
  {
    id: "ros-frontend 1",
    epic: "product",
    title: "The surfaces four earlier tasks owe: the prime report, the patents design, build health, and the engine host",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "The work of 2026-09-18 and 2026-09-19 becomes readable where people work",
  },

  // AI evidence search, from learning/research-os/ai/IMPLEMENTATION.md. The
  // local pilot is one researcher on this machine, so its slices sit here;
  // the release to other pilot accounts is near-term.
  {
    id: "ros-ai-access",
    epic: "ai",
    title: "One read-authorization adapter across the reading routes, and durable receipts for curated quotes",
    stage: "mvp",
    status: "partial",
    cost: "m",
    dependsOn: [],
    unlocks: "Every AI slice after it, since no search may read a row its viewer cannot see",
  },
  {
    id: "ros-ai-dispatch",
    epic: "ai",
    title: "Pending beads filed once each, with their dependency edges read back",
    stage: "mvp",
    status: "shipped",
    cost: "s",
    dependsOn: [],
    unlocks: "The AI queue in Nucleus with its order enforced, once the host returns",
  },
  {
    id: "ros-ai-corpus",
    epic: "ai",
    title: "Admitted public sources: rights, canonical ids, body hashes, and a validator for the local artifacts",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: ["ros-ai-access"],
    unlocks: "A corpus the encoder may index and Quote may check under lock",
  },
  {
    id: "ros-ai-worker",
    epic: "ai",
    title: "A CPU encoder worker on this machine beside server BM25, with a pinned model, a bounded queue and a resource probe",
    stage: "mvp",
    status: "open",
    cost: "l",
    dependsOn: ["ros-ai-corpus"],
    unlocks: "Search by meaning, with keyword search still answering when the worker is down",
  },
  {
    id: "ros-ai-find",
    epic: "ai",
    title: "Workspace Find by meaning, opening a source node and quoting it with a durable receipt",
    stage: "mvp",
    status: "open",
    cost: "m",
    dependsOn: ["ros-ai-access", "ros-ai-worker"],
    unlocks: "The find-and-quote step of the loop, by meaning",
  },
  {
    id: "ros-ai-import-quotes",
    epic: "ai",
    title: "Quotes from imported passages: versioned source cards, a reader, and receipts that Check and production accept",
    stage: "mvp",
    status: "open",
    cost: "l",
    dependsOn: ["ros-ai-find", "ros-import 1", "ros-import 2", "ros-import 3"],
    unlocks: "Material a researcher brings in becomes quotable evidence",
  },

  // ---- near-term -------------------------------------------------------
  {
    id: "ros-patents 2",
    epic: "patents",
    title: "A first patent corpus in the graph, linked to the science it cites",
    stage: "near",
    status: "open",
    cost: "l",
    dependsOn: ["ros-patents 1"],
    blockedBy: ["FD-1"],
    unlocks: "Patents as nodes, and prior-art search over them",
  },
  {
    id: "ros-patents 3",
    epic: "patents",
    title: "Prior-art search over patents, papers and canon for a node or a draft production",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: ["ros-patents 2"],
    unlocks: "A researcher sees what already exists before producing",
  },
  {
    id: "ros-workbench 0",
    epic: "workbench",
    title: "The software atlas across the sciences, open and closed, with a direction for each",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "What Research OS builds, what it integrates, and what it leaves alone",
  },
  {
    id: "ros-workbench 1",
    epic: "workbench",
    title: "Research memo and design for compute sharing, notebooks, statistics, machine learning and LaTeX",
    stage: "near",
    status: "partial",
    cost: "l",
    dependsOn: ["ros-workbench 0"],
    unlocks: "The whole tools half of Research OS",
  },
  // The surfaces the two memos owe under the critic protocol's surface gate.
  {
    id: "ros-workbench 0 surface",
    epic: "workbench",
    title: "The software atlas as a Research OS page: every tool filtered by field, license, and the path that reaches it",
    stage: "near",
    status: "open",
    cost: "s",
    dependsOn: ["ros-workbench 0"],
    unlocks: "The atlas used where people work, without reading the memo",
  },
  {
    id: "ros-workbench 1 surface",
    epic: "workbench",
    title: "The workbench section on the node page: a node's runs, their marks, and a reproduce action",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: ["ros-workbench 1"],
    unlocks: "A computation shown and reproducible where its node is read",
  },
  {
    id: "ros-prime 4b",
    epic: "primes",
    title: "Map layers colored by tier, penetration and truth level",
    stage: "near",
    status: "open",
    cost: "s",
    dependsOn: ["ros-prime 3"],
    unlocks: "The shape of the graph at a glance",
  },
  {
    id: "ros-prime 5",
    epic: "primes",
    title: "Split the canon concept tags into the people they name and the ideas they stand for",
    stage: "near",
    status: "open",
    cost: "s",
    dependsOn: ["ros-prime 2"],
    unlocks: "105 tags the decompose-further queue leaves out today",
  },
  {
    id: "ros-graph-dedup",
    epic: "graph",
    title: "Find and merge nodes that name one concept in several branches",
    stage: "near",
    status: "shipped",
    cost: "m",
    dependsOn: ["ros-prime 2"],
    unlocks: "Factor edges that the verifier stops refusing as duplicates",
  },
  {
    id: "ros-import 4 to 5",
    epic: "imports",
    title: "Imports in search and on the map, shared private, with a class, or public through grants",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: ["ros-import 3", "ros-27"],
    unlocks: "Imported material other people can reach",
  },
  {
    id: "ros-24",
    epic: "levels",
    title: "Awareness view: dependents, the frontier around a node, open questions, the path map",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: ["ros-prime 3"],
    unlocks: "The second of the five levels, as a view people use",
  },
  {
    id: "ros-26",
    epic: "levels",
    title: "Production placement in the graph, and an ingenuity score against everything in it",
    stage: "near",
    status: "open",
    cost: "l",
    dependsOn: ["ros-prime 3", "ros-truth 2"],
    unlocks: "What a finished production is worth, in the graph's own terms",
  },
  {
    id: "ros-27",
    epic: "levels",
    title: "Roles as access grants: learner, teacher, librarian, parent, peer, reviewer, researcher",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "Sharing, classes, and a parent's view of a learner's work",
  },
  {
    id: "ros-truth 3",
    epic: "truth",
    title: "First-hand verification in a person's standing",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: ["ros-truth 2"],
    unlocks: "Seeing and measuring counts for more than reading",
  },
  {
    id: "local model tier",
    epic: "platform",
    title: "Fix the Ollama runner, which core-dumps on every model on this machine",
    stage: "near",
    status: "open",
    cost: "s",
    dependsOn: [],
    unlocks: "A second judge that is not Claude, and cheaper proposal passes",
  },
  {
    id: "site copy",
    epic: "direction",
    title: "The human-AI-computer direction in the site's public words",
    stage: "near",
    status: "open",
    cost: "s",
    dependsOn: ["research: human-AI-computer work"],
    blockedBy: ["FD-4"],
    unlocks: "The public reading of what Research OS is for",
  },

  {
    id: "ros-09a",
    epic: "funding",
    title: "The targets that take an individual: Tools Competition by 2026-10-13, DPG registration, the Renaissance Philanthropy inquiry, and the Sentry open-source plan",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "Funding and credits that need no entity decision, on the nearest live deadline",
  },
  {
    id: "ros-09b",
    epic: "funding",
    title: "NLnet NGI Zero by 2026-11-03, which first needs NLnet's answer on the European-dimension bar",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: [],
    unlocks: "The feed402 grant path, once a US applicant's standing is confirmed",
  },
  {
    id: "ros-09c",
    epic: "funding",
    title: "The targets that ask who the applicant is: Cloudflare Project Galileo, which asks for a nonprofit, Vercel for Startups, whose eligibility is unstated, and Fast Forward's next cycle",
    stage: "near",
    status: "open",
    cost: "m",
    dependsOn: [],
    blockedBy: ["FD-8"],
    unlocks: "The funders and credit programs whose answer turns on the entity",
  },

  {
    id: "ros-ai-eval",
    epic: "ai",
    title: "Sealed retrieval judgments, the runtime and revocation gates, and the release decision for pilot accounts",
    stage: "near",
    status: "open",
    cost: "l",
    dependsOn: ["ros-ai-find", "ros-ai-import-quotes"],
    unlocks: "Search by meaning for adult pilot accounts beyond the founder",
  },
  {
    id: "ros-ai-hte-parity",
    epic: "ai",
    title: "The engine's runner and reconstruction score source metadata the same way",
    stage: "near",
    status: "open",
    cost: "s",
    dependsOn: ["ros-ai-eval"],
    unlocks: "A fixed engine baseline for the replication study",
  },
  {
    id: "ros-ai-research",
    epic: "ai",
    title: "The source-aware replication study: an acquisition audit, the closest prior work, and a power decision",
    stage: "near",
    status: "open",
    cost: "l",
    dependsOn: ["ros-ai-eval", "ros-ai-hte-parity", "ros-truth 1", "ros-truth 2"],
    unlocks: "A published answer on whether source-aware prediction replicates",
  },
  {
    id: "ros-ai-watch",
    epic: "ai",
    title: "The daily model watch as a ledger that proposes one candidate change at a milestone",
    stage: "near",
    status: "open",
    cost: "s",
    dependsOn: ["ros-ai-corpus"],
    unlocks: "Model and method changes reach the plan through a review",
  },

  // ---- later -----------------------------------------------------------
  {
    id: "ros-workbench 2",
    epic: "workbench",
    title: "Register your own machine as a compute provider, with a sandboxed runner",
    stage: "later",
    status: "open",
    cost: "l",
    dependsOn: ["ros-workbench 1"],
    unlocks: "Compute nobody has to pay a cloud for",
  },
  {
    id: "ros-workbench 3 to 5",
    epic: "workbench",
    title: "Statistics and plots, machine learning functions, custom code and LaTeX documents",
    stage: "later",
    status: "open",
    cost: "l",
    dependsOn: ["ros-workbench 2", "ros-import 3"],
    unlocks: "Analysis inside Research OS, on your own data",
  },
  {
    id: "ros-import 6 to 8",
    epic: "imports",
    title: "Hosted feed402 datasets, self-hosted provider registration, read-only MCP tools",
    stage: "later",
    status: "open",
    cost: "l",
    dependsOn: ["ros-import 4 to 5"],
    unlocks: "A person becomes a data provider, free or priced over x402",
  },
  {
    id: "ros-patents 4",
    epic: "patents",
    title: "Claims decomposed into elements, and invention disclosure as a production kind",
    stage: "later",
    status: "open",
    cost: "m",
    dependsOn: ["ros-patents 2", "ros-prime 2"],
    blockedBy: ["FD-2", "FD-3"],
    unlocks: "A claim read as a combination of known primes, and a disclosure the graph can hold",
  },
  {
    id: "ros-31",
    epic: "levels",
    title: "Papers and the publish form under Produce, the research agent and tools behind the model switch",
    stage: "later",
    status: "open",
    cost: "m",
    dependsOn: ["ros-workbench 1"],
    unlocks: "The engine and the tools where people work",
  },
  {
    id: "ros-32",
    epic: "levels",
    title: "Under-13 gates: the school exception, vendor consent, guardian as payee",
    stage: "later",
    status: "open",
    cost: "l",
    dependsOn: ["ros-27"],
    unlocks: "Learners under 13 outside a rostered class",
  },
  {
    id: "ros-33",
    epic: "levels",
    title: "The path map and the game layer over every branch",
    stage: "later",
    status: "open",
    cost: "m",
    dependsOn: ["ros-24"],
    unlocks: "A learner's daily loop across the whole graph",
  },
];

export const STAGES: Stage[] = ["mvp", "near", "later"];

/**
 * The rows of `docs/FOUNDER-DECISIONS.md` a `blockedBy` may name.
 *
 * Declared here and in that file, which is one shape declared twice: the
 * memo gained FD-9 to FD-11 and this list did not, so the roadmap
 * reported three real decisions as rows that do not exist
 * (Bucket critic F-4). `scripts/test-research-os-roadmap-decisions.ts`
 * parses the ids out of the memo and fails on any divergence.
 */
export const DECISIONS = ["FD-1", "FD-2", "FD-3", "FD-4", "FD-5", "FD-6", "FD-7", "FD-8", "FD-9", "FD-10", "FD-11"];

const STAGE_ORDER: Record<Stage, number> = { mvp: 0, near: 1, later: 2 };

export function itemsByStage(stage: Stage, items: RoadmapItem[] = ROADMAP): RoadmapItem[] {
  return items.filter((i) => i.stage === stage);
}

export function countsByStage(items: RoadmapItem[] = ROADMAP): Record<Stage, { open: number; shipped: number }> {
  const out = {
    mvp: { open: 0, shipped: 0 },
    near: { open: 0, shipped: 0 },
    later: { open: 0, shipped: 0 },
  };
  for (const i of items) {
    if (i.status === "shipped") out[i.stage].shipped += 1;
    else out[i.stage].open += 1;
  }
  return out;
}

/**
 * Items with nothing open in front of them, in stage order. `items` is what
 * to return, and `universe` is where a dependency's status is read, so a
 * filtered view does not read a dependency outside it as unshipped.
 */
export function readyNow(items: RoadmapItem[] = ROADMAP, universe: RoadmapItem[] = ROADMAP): RoadmapItem[] {
  const status = new Map(universe.map((i) => [i.id, i.status]));
  return items
    .filter((i) => i.status === "open" && !i.blockedBy)
    .filter((i) => i.dependsOn.every((d) => status.get(d) === "shipped"))
    .sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
}

/**
 * Every decision standing between an item and its start: its own, and the
 * ones blocking the unshipped items it rests on.
 */
export function decisionsFor(item: RoadmapItem, items: RoadmapItem[] = ROADMAP): string[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const found = new Set<string>();
  const seen = new Set<string>();
  const walk = (i: RoadmapItem): void => {
    if (seen.has(i.id)) return;
    seen.add(i.id);
    for (const fd of i.blockedBy ?? []) found.add(fd);
    for (const d of i.dependsOn) {
      const dep = byId.get(d);
      if (dep && dep.status !== "shipped") walk(dep);
    }
  };
  walk(item);
  return Array.from(found).sort();
}

/** Rules the list has to keep: named dependencies, no blocked MVP row, no cycles. */
export function roadmapProblems(items: RoadmapItem[] = ROADMAP): string[] {
  const ids = new Set(items.map((i) => i.id));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    if (seen.has(i.id)) problems.push(`${i.id} appears twice`);
    seen.add(i.id);
    for (const d of i.dependsOn) {
      if (!ids.has(d)) problems.push(`${i.id} depends on ${d}, which is not on the list`);
    }
    const waiting = decisionsFor(i, items);
    if (i.stage === "mvp" && waiting.length > 0) {
      problems.push(`${i.id} sits in MVP and waits on ${waiting.join(" and ")}`);
    }
    for (const fd of i.blockedBy ?? []) {
      if (!DECISIONS.includes(fd)) problems.push(`${i.id} waits on ${fd}, which is not a row of FOUNDER-DECISIONS.md`);
    }
    for (const d of i.dependsOn) {
      const dep = items.find((x) => x.id === d);
      if (dep && STAGE_ORDER[dep.stage] > STAGE_ORDER[i.stage]) {
        problems.push(`${i.id} is staged ${STAGE_LABEL[i.stage]} over ${d}, which is staged ${STAGE_LABEL[dep.stage]}`);
      }
    }
    if (
      i.status === "shipped" &&
      i.dependsOn.some((d) => {
        const dep = items.find((x) => x.id === d);
        return dep && dep.status !== "shipped";
      })
    ) {
      problems.push(`${i.id} is shipped over an unshipped dependency`);
    }
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  const state = new Map<string, number>();
  const walk = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      problems.push(`dependency cycle: ${[...path, id].join(" -> ")}`);
      return;
    }
    state.set(id, 1);
    for (const d of byId.get(id)?.dependsOn ?? []) {
      if (byId.has(d)) walk(d, [...path, id]);
    }
    state.set(id, 2);
  };
  for (const i of items) walk(i.id, []);
  return problems;
}
