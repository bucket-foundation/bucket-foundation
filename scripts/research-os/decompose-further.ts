import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decompose, FACTOR_EDGES, type DepEdge } from "../../src/lib/research-os/primes";
import { refdAgreement, refdAucInterval, scorePairs } from "../../src/lib/research-os/refd";
import { wikipediaIndex } from "./wikipedia-links";
import {
  agreementStats,
  answeringModel,
  applyVerdicts,
  ideaLayer,
  irreducibleAction,
  modelMatchesAlias,
  reuseEarlierKeys,
  aggregateMissing,
  blindSet,
  buildConsolidatePrompt,
  buildPrompt,
  buildVerifyPrompt,
  confidenceFor,
  consolidate,
  cosine,
  cyclicPairs,
  idfOf,
  impactOf,
  isCandidateIdea,
  MAX_FACTORS,
  MAX_MISSING,
  missingKey,
  parseAnswer,
  parseConsolidation,
  parseVerdicts,
  promptHash,
  selectTargets,
  shortlist,
  toProposals,
  verificationOf,
  CONFIDENCE_SOURCE,
  type AgreementRow,
  type Answer,
  type Candidate,
  type ConsolidateItem,
  type ConsolidatedGroup,
  type GraphNode,
  type NodeProposalRow,
  type ProposalRow,
  type Target,
  type Verdict,
} from "../../src/lib/research-os/decompose-further";

const OUT = path.join(__dirname, "ingest", "out");
const CACHE = path.join(OUT, "decompose-cache");
const CONSOLIDATE_BATCH = 60;
const DUPLICATE_SIMILARITY = 0.75;
const SAME_PROPOSAL_SIMILARITY = 0.93;

const VERIFY_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: { type: "object", properties: { slug: { type: "string" }, holds: { type: "boolean" }, why: { type: "string" } }, required: ["slug", "holds", "why"] },
    },
  },
  required: ["verdicts"],
};

const SCHEMA = {
  type: "object",
  properties: {
    irreducible: { type: "boolean" },
    irreducible_why: { type: "string" },
    factors: { type: "array", maxItems: MAX_FACTORS, items: { type: "object", properties: { slug: { type: "string" }, why: { type: "string" } }, required: ["slug", "why"] } },
    missing: {
      type: "array",
      maxItems: MAX_MISSING,
      items: { type: "object", properties: { title: { type: "string" }, branch: { type: "string" }, why: { type: "string" } }, required: ["title", "branch", "why"] },
    },
  },
  required: ["irreducible", "factors", "missing"],
};

const CONSOLIDATE_SCHEMA = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          canonical: { type: "string" },
          branch: { type: "string" },
          definition: { type: "string" },
          members: { type: "array", items: { type: "string" } },
          same_as: { type: ["string", "null"] },
        },
        required: ["canonical", "branch", "definition", "members", "same_as"],
      },
    },
  },
  required: ["groups"],
};

export function embed(items: { id: string; text: string }[]): Map<string, number[]> {
  if (!items.length) return new Map();
  const res = spawnSync("python3", [path.join(__dirname, "embed-texts.py")], {
    input: JSON.stringify(items),
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (res.status !== 0) throw new Error(`embed-texts.py exited ${res.status}: ${(res.stderr || "").slice(-300)}`);
  return new Map(Object.entries(JSON.parse(res.stdout) as Record<string, number[]>));
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function all<T>(svc: SupabaseClient, table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = svc.from(table).select(columns);
    if (filter) q = filter(q);
    const { data, error } = await q.order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

function askClaude(prompt: string, model: string, timeoutMs: number, schema: object): Promise<{ text: string; modelId: string }> {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const argv = [
    "-p", prompt,
    "--model", model,
    "--setting-sources", "",
    "--output-format", "json",
    "--json-schema", JSON.stringify(schema),
    "--tools", "",
    "--no-session-persistence",
    "--strict-mcp-config",
  ];
  return new Promise((resolve, reject) => {
    const child = spawn("claude", argv, { env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => (clearTimeout(timer), reject(e)));
    child.on("close", (code) => {
      clearTimeout(timer);
      let envelope: any = null;
      try {
        envelope = JSON.parse(out);
      } catch {
        envelope = null;
      }
      if (code !== 0 || !envelope || envelope.is_error) {
        reject(new Error(`claude -p exited ${code}${envelope?.stop_reason ? `, stop_reason ${envelope.stop_reason}` : ""}: ${(err || out).slice(0, 200)}`));
        return;
      }
      const modelId = answeringModel(envelope.modelUsage, model);
      resolve({ text: envelope.structured_output ? JSON.stringify(envelope.structured_output) : String(envelope.result ?? ""), modelId });
    });
  });
}

type Cached<T> = { value: T | { error: string }; hash: string; cached: boolean };
type QueuedPair = { id: string; from_slug: string; to_slug: string; refd?: number | null; in_cycle?: boolean | null };
type MergeRow = { pair_from: string; pair_to: string; written: boolean; held_status: string | null; held_source: string | null };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const limit = Number(arg("--limit", "0"));
  const concurrency = Math.max(1, Number(arg("--concurrency", "4")));
  const proposerAlias = arg("--model", "sonnet")!;
  const verifierAlias = arg("--verify-model", "opus")!;
  const dryRun = process.argv.includes("--dry-run");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  async function resolveModel(alias: string): Promise<string> {
    const probe = await askClaude("Reply with the single word ok.", alias, 120_000, { type: "object", properties: { ok: { type: "string" } }, required: ["ok"] });
    if (!modelMatchesAlias(alias, probe.modelId))
      throw new Error(`model alias ${alias} resolved to ${probe.modelId}; refusing to run under the wrong model`);
    return probe.modelId;
  }
  const model = await resolveModel(proposerAlias);
  const verifyModel = await resolveModel(verifierAlias);
  const mismatched: { hash: string; expected: string; answered: string }[] = [];

  async function cachedAsk<T>(prompt: string, m: string, schema: object, accept: (reply: string) => T | { error: string }): Promise<Cached<T>> {
    const hash = promptHash(`${m}\n${prompt}`);
    const cacheFile = path.join(CACHE, `${hash}.txt`);
    const metaFile = path.join(CACHE, `${hash}.model`);
    if (existsSync(cacheFile)) return { value: accept(readFileSync(cacheFile, "utf8")), hash, cached: true };
    const res = await askClaude(prompt, m, 300_000, schema);
    if (res.modelId !== m) {
      mismatched.push({ hash, expected: m, answered: res.modelId });
      return { value: { error: `answered by ${res.modelId}, expected ${m}` } as T | { error: string }, hash, cached: false };
    }
    const value = accept(res.text);
    if (!(value && typeof value === "object" && "error" in (value as object))) {
      writeFileSync(cacheFile, res.text);
      writeFileSync(metaFile, res.modelId);
    }
    return { value, hash, cached: false };
  }

  const rows = await all<GraphNode & { id: string }>(svc, "nodes", "id, slug, title, kind, branch, summary, provenanceType:provenance->>type", (q) =>
    q.eq("visibility", "public").is("superseded_by", null),
  );
  const edgeRows = await all<{ id: string; from_id: string; to_id: string; kind: string; confidence: number | null }>(svc, "edges", "id, from_id, to_id, kind, confidence", (q) =>
    q.in("kind", Object.keys(FACTOR_EDGES)),
  );
  const liveIds = new Set(rows.map((n) => n.id));
  const edges: DepEdge[] = edgeRows
    .filter((e) => liveIds.has(e.from_id) && liveIds.has(e.to_id))
    .map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));
  const layer = ideaLayer(rows, edges);
  const dec = decompose(layer.nodes, layer.edges);
  const pool: Candidate[] = rows.map((n) => {
    const d = dec.get(n.id);
    return { ...n, tier: !d || d.status === "unfactored" ? null : d.tier, prime: d?.status === "prime" };
  });
  const bySlug = new Map(pool.map((c) => [c.slug, c]));
  const idOf = new Map(rows.map((n) => [n.slug, n.id]));
  const ideaPool = pool.filter(isCandidateIdea);
  const vectors = embed(ideaPool.map((c) => ({ id: c.slug, text: `${c.title}. ${c.summary ?? ""}`.trim() })));
  const idf = idfOf(ideaPool);

  const irreducibleRows = await all<{ id: string; node_slug: string; status: string; decision_reason: string | null }>(
    svc,
    "irreducible_proposals",
    "id, node_slug, status, decision_reason",
  );
  const settled = new Set(irreducibleRows.filter((r) => r.status !== "rejected").map((r) => r.node_slug));
  const rejectedWhy = new Map(irreducibleRows.filter((r) => r.status === "rejected").map((r) => [r.node_slug, r.decision_reason ?? ""]));
  let targets = selectTargets(rows, dec).filter((t) => !settled.has(t.slug));

  const show = arg("--show-shortlist");
  if (show) {
    const t = selectTargets(rows, dec).find((x) => x.slug === show);
    if (!t) throw new Error(`${show} is not a decompose target`);
    for (const c of shortlist(t, pool, dec, { vectors, idf })) console.log(`${c.branch}\t${c.tier ?? "-"}\t${c.slug}\t${c.title}`);
    return;
  }
  if (limit > 0) targets = targets.slice(0, limit);
  mkdirSync(CACHE, { recursive: true });
  console.log(`[decompose-further] ${targets.length} targets (${settled.size} left out as irreducible), proposer ${model}, verifier ${verifyModel}${dryRun ? ", dry run" : ""}`);

  type Result = { target: Target; answer: Answer; hash: string; cached: boolean; verdicts: Map<string, Verdict>; verifyHash: string | null };
  const results: Result[] = [];
  const agreement: AgreementRow[] = [];
  const failures: { slug: string; reason: string }[] = [];
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < targets.length) {
      const target = targets[next++];
      const cands = shortlist(target, pool, dec, { vectors, idf });
      try {
        const allowed = new Set(cands.map((c) => c.slug));
        const ask = await cachedAsk(buildPrompt(target, cands, { rejectedIrreducible: rejectedWhy.get(target.slug) ?? null }), model, SCHEMA, (r) =>
          parseAnswer(r, allowed, target.slug),
        );
        const parsed = ask.value;
        if ("error" in parsed) {
          failures.push({ slug: target.slug, reason: `proposer: ${parsed.error}` });
        } else {
          const verdicts = new Map<string, Verdict>();
          let verifyHash: string | null = null;
          let verified = true;
          const picks = parsed.factors.map((f) => bySlug.get(f.slug)!).filter(Boolean);
          if (picks.length) {
            const { items, picked } = blindSet(target, picks, cands);
            const asked = new Set(items.map((i) => i.slug));
            const v = await cachedAsk(buildVerifyPrompt(target, items), verifyModel, VERIFY_SCHEMA, (r) => parseVerdicts(r, asked));
            verifyHash = v.hash;
            if ("error" in v.value) {
              failures.push({ slug: target.slug, reason: `verifier: ${v.value.error}` });
              verified = false;
            } else {
              for (const [slug, verdict] of Array.from(v.value)) {
                agreement.push({ target: target.slug, slug, picked: picked.has(slug), holds: verdict.holds });
                if (picked.has(slug)) verdicts.set(slug, verdict);
              }
            }
          }
          if (verified) results.push({ target, answer: parsed, hash: ask.hash, cached: ask.cached, verdicts, verifyHash });
        }
      } catch (e) {
        failures.push({ slug: target.slug, reason: e instanceof Error ? e.message : String(e) });
      }
      done++;
      if (done % 10 === 0 || done === targets.length) console.log(`[decompose-further] ${done}/${targets.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  results.sort((a, b) => a.target.slug.localeCompare(b.target.slug));

  const missing = aggregateMissing(results);
  const nearestOf = (v: number[] | undefined, n: number, floor: number) =>
    !v
      ? []
      : ideaPool
          .map((c) => ({ c, s: vectors.has(c.slug) ? cosine(v, vectors.get(c.slug)!) : 0 }))
          .filter((x) => x.s >= floor)
          .sort((a, b) => b.s - a.s)
          .slice(0, n);
  const missingVectors = embed(missing.map((m) => ({ id: m.key, text: m.title })));
  const items: ConsolidateItem[] = missing.map((m) => ({
    id: m.key,
    title: m.title,
    branch: Object.keys(m.branches)[0] ?? null,
    nearest: nearestOf(missingVectors.get(m.key), 3, 0).map((x) => ({ slug: x.c.slug, title: x.c.title })),
  }));
  items.sort((a, b) => (a.nearest[0]?.slug ?? "").localeCompare(b.nearest[0]?.slug ?? "") || a.id.localeCompare(b.id));
  const groups: ConsolidatedGroup[] = [];
  const singletons = (batch: ConsolidateItem[]) => batch.map((it) => ({ canonical: it.title, branch: it.branch ?? "", members: [it.id], sameAs: null, definition: null }));
  for (let i = 0; i < items.length; i += CONSOLIDATE_BATCH) {
    const batch = items.slice(i, i + CONSOLIDATE_BATCH);
    try {
      const c = await cachedAsk(buildConsolidatePrompt(batch), model, CONSOLIDATE_SCHEMA, (r) => parseConsolidation(r, batch));
      if ("error" in c.value) {
        failures.push({ slug: `consolidate:${i}`, reason: c.value.error });
        groups.push(...singletons(batch));
      } else groups.push(...c.value);
    } catch (e) {
      failures.push({ slug: `consolidate:${i}`, reason: e instanceof Error ? e.message : String(e) });
      groups.push(...singletons(batch));
    }
  }
  const canonicalVectors = embed(groups.map((g, i) => ({ id: String(i), text: g.canonical })));
  const canonicalIndex = new Map(groups.map((g, i) => [g.canonical, String(i)]));
  const duplicatesOf = (title: string, exclude: ReadonlySet<string>) =>
    nearestOf(canonicalVectors.get(canonicalIndex.get(title) ?? ""), 3 + exclude.size, DUPLICATE_SIMILARITY)
      .filter((x) => !exclude.has(x.c.slug))
      .slice(0, 3)
      .map((x) => ({
        slug: x.c.slug,
        title: x.c.title,
        similarity: Math.round(x.s * 1000) / 1000,
      }));
  const outcome = consolidate(groups, missing, model, duplicatesOf);

  const earlier = await all<{ id: string; key: string; title: string; status: string; created_node_id: string | null }>(
    svc,
    "node_proposals",
    "id, key, title, status, created_node_id",
  );
  const earlierVectors = embed(earlier.map((e) => ({ id: e.key, text: e.title })));
  const newVectors = embed(outcome.nodeProposals.map((r) => ({ id: r.key, text: r.title })));
  const reusedKeys = reuseEarlierKeys(
    outcome.nodeProposals,
    earlier,
    (a, b) => {
      const v = newVectors.get(a);
      const w = earlierVectors.get(b);
      return v && w ? cosine(v, w) : 0;
    },
    SAME_PROPOSAL_SIMILARITY,
  );

  const branchOf = new Map<string, string | null>(rows.map((n) => [n.slug, n.branch]));
  const proposals: ProposalRow[] = results.flatMap((r) =>
    toProposals(r.target, r.answer, {
      model,
      hash: r.hash,
      verdicts: r.verdicts,
      verifyModel,
      verifyHash: r.verifyHash,
      impact: impactOf(r.target.id, dec),
      branchOf,
    }),
  );
  const proposed = new Set(proposals.map((p) => `${p.from_slug}->${p.to_slug}`));
  const targetBySlug = new Map(results.map((r) => [r.target.slug, r.target]));
  const matchedDropped: { factor: string; target: string; reason: "is_the_target" | "rests_on_target" | "already_proposed" | "not_a_target" | "no_node" }[] = [];
  for (const m of outcome.matched) {
    const factor = bySlug.get(m.slug);
    if (!factor) {
      for (const t of m.targets) matchedDropped.push({ factor: m.slug, target: t, reason: "no_node" });
      continue;
    }
    for (const t of m.targets) {
      const target = targetBySlug.get(t);
      if (!target) {
        matchedDropped.push({ factor: m.slug, target: t, reason: "not_a_target" });
        continue;
      }
      if (t === m.slug) {
        matchedDropped.push({ factor: m.slug, target: t, reason: "is_the_target" });
        continue;
      }
      if (proposed.has(`${m.slug}->${t}`)) {
        matchedDropped.push({ factor: m.slug, target: t, reason: "already_proposed" });
        continue;
      }
      if (dec.get(factor.id)?.signature.has(target.id)) {
        matchedDropped.push({ factor: m.slug, target: t, reason: "rests_on_target" });
        continue;
      }
      proposed.add(`${m.slug}->${t}`);
      const named = `named as "${m.titles.join('", "')}"`;
      proposals.push(
        ...toProposals(target, { irreducible: false, factors: [{ slug: m.slug, why: "" }], missing: [] }, {
          model,
          hash: `consolidate:${missingKey(m.titles[0] ?? m.slug)}`.slice(0, 64),
          verdicts: new Map(),
          verifyModel,
          verifyHash: null,
          impact: impactOf(target.id, dec),
          branchOf,
          origin: "missing_matched",
          reasons: new Map([[m.slug, m.reasons[t] ? `${m.reasons[t]} (${named})` : `The proposer ${named}, and this node is that idea.`]]),
        }),
      );
    }
  }

  const pendingUnchecked = dryRun
    ? []
    : await all<QueuedPair>(svc, "edge_proposals", "id, from_slug, to_slug", (q) =>
        q.eq("status", "pending").eq("confidence_source", CONFIDENCE_SOURCE).eq("verification", "unchecked"),
      );
  const byTarget = new Map<string, { fresh: ProposalRow[]; queued: QueuedPair[] }>();
  const slot = (to: string) => {
    if (!byTarget.has(to)) byTarget.set(to, { fresh: [], queued: [] });
    return byTarget.get(to)!;
  };
  for (const p of proposals) if (p.verification === "unchecked") slot(p.to_slug).fresh.push(p);
  for (const r of pendingUnchecked) if (!proposed.has(`${r.from_slug}->${r.to_slug}`)) slot(r.to_slug).queued.push(r);
  const dbVerdicts: { id: string; verdict: Verdict; hash: string }[] = [];
  const checkedNamed = new Set<string>();
  for (const [to, s] of Array.from(byTarget)) {
    const target = bySlug.get(to);
    const factors = s.fresh.map((p) => p.from_slug).concat(s.queued.map((q) => q.from_slug)).map((slug) => bySlug.get(slug)).filter(Boolean) as Candidate[];
    if (!target || !factors.length) continue;
    try {
      const v = await cachedAsk(buildVerifyPrompt({ ...target, status: "prime" }, factors), verifyModel, VERIFY_SCHEMA, (r) =>
        parseVerdicts(r, new Set(factors.map((f) => f.slug))),
      );
      if ("error" in v.value) {
        failures.push({ slug: `verify:${to}`, reason: v.value.error });
        continue;
      }
      for (const p of s.fresh) if (v.value.has(p.from_slug)) checkedNamed.add(`${p.from_slug}->${p.to_slug}`);
      applyVerdicts(s.fresh, v.value, verifyModel, v.hash);
      for (const q of s.queued) {
        const verdict = v.value.get(q.from_slug);
        if (verdict) dbVerdicts.push({ id: q.id, verdict, hash: v.hash });
      }
    } catch (e) {
      failures.push({ slug: `verify:${to}`, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  const pendingAll = dryRun
    ? []
    : await all<QueuedPair>(svc, "edge_proposals", "id, from_slug, to_slug, refd, in_cycle", (q) => q.eq("status", "pending").eq("confidence_source", CONFIDENCE_SOURCE));
  const olderPending = pendingAll.filter((r) => !proposed.has(`${r.from_slug}->${r.to_slug}`));
  const cyclic = cyclicPairs(edges, [...proposals, ...olderPending], idOf);
  const inCycle = (p: { from_slug: string; to_slug: string }) => cyclic.has(`${p.from_slug}->${p.to_slug}`);
  const withCycle = proposals.map((p) => ({ ...p, in_cycle: inCycle(p) }));

  const irreducible = results.filter((r) => r.answer.irreducible);

  const blindPairs = agreement.filter((a) => a.slug).map((a) => ({ from_slug: a.slug!, to_slug: a.target }));
  let refdOf = (_from: string, _to: string): number | null => null;
  let wiki: { articles: number; mapped: number; via_corpus: number; requests: number; error: string | null } = {
    articles: 0,
    mapped: 0,
    via_corpus: 0,
    requests: 0,
    error: null,
  };
  try {
    const idx = await wikipediaIndex(
      ideaPool.map((c) => ({ slug: c.slug, title: c.title })),
      { offline: process.argv.includes("--offline-wiki") },
    );
    const scores = scorePairs([...withCycle, ...olderPending, ...blindPairs], idx.titleOf, idx.links);
    refdOf = (from, to) => {
      const key = `${from}->${to}`;
      if (scores.has(key)) return scores.get(key)!;
      const one = scorePairs([{ from_slug: from, to_slug: to }], idx.titleOf, idx.links);
      return one.get(key) ?? null;
    };
    wiki = {
      articles: idx.links.size,
      mapped: idx.titleOf.size,
      via_corpus: Array.from(idx.via.values()).filter((v) => v === "corpus").length,
      requests: idx.requests,
      error: null,
    };
  } catch (e) {
    wiki.error = e instanceof Error ? e.message : String(e);
    failures.push({ slug: "wikipedia", reason: wiki.error });
  }
  for (const p of withCycle) p.refd = refdOf(p.from_slug, p.to_slug);
  const refdProposals = refdAgreement(withCycle);
  const blindScored = agreement
    .filter((a) => a.slug)
    .map((a) => ({ target: a.target, picked: a.picked, refd: refdOf(a.slug!, a.target), verification: a.holds ? "confirmed" : "refuted" }));
  const refdBlind = refdAgreement(blindScored);
  const refdAuc = {
    proposals: refdAucInterval(withCycle.map((p) => ({ target: p.to_slug, refd: p.refd, verification: p.verification }))),
    blinded: refdAucInterval(blindScored),
    blinded_picks: refdAucInterval(blindScored.filter((b) => b.picked)),
    blinded_passed_over: refdAucInterval(blindScored.filter((b) => !b.picked)),
  };

  const queued = {
    edge_proposals: 0,
    node_proposals: 0,
    irreducible: 0,
    from_approved_base_ideas: 0,
    verdicts_on_queued: 0,
    older_pairs_in_cycle: 0,
    older_pairs_scored: 0,
    irreducible_reopened: 0,
    edge_rows_skipped: 0,
    older_pairs_out_of_cycle: 0,
  };
  const skipped: { from: string; to: string; status: string | null; source: string | null }[] = [];
  function tallyMerge(rowsOut: MergeRow[] | null, countWritten = true): number {
    let written = 0;
    for (const m of rowsOut ?? []) {
      if (m.written) written++;
      else {
        skipped.push({ from: m.pair_from, to: m.pair_to, status: m.held_status, source: m.held_source });
        queued.edge_rows_skipped++;
      }
    }
    if (countWritten) queued.edge_proposals += written;
    return written;
  }
  if (!dryRun) {
    for (let i = 0; i < withCycle.length; i += 200) {
      const { data, error } = await svc.rpc("merge_edge_proposals", { p_rows: withCycle.slice(i, i + 200) });
      if (error) throw new Error(`merge_edge_proposals: ${error.message}`);
      tallyMerge(data as MergeRow[] | null);
    }
    for (const d of dbVerdicts) {
      const ver = verificationOf(d.verdict);
      const { error } = await svc
        .from("edge_proposals")
        .update({
          verification: ver,
          confidence: confidenceFor(ver),
          agreement: ver === "confirmed",
          secondary_justification: `${verifyModel}: ${d.verdict.why || (d.verdict.holds ? "confirmed" : "not confirmed")}`,
          secondary_prompt_hash: d.hash,
        })
        .eq("id", d.id)
        .eq("status", "pending");
      if (error) throw new Error(`edge_proposals verdict: ${error.message}`);
      queued.verdicts_on_queued++;
    }
    for (const r of olderPending) {
      const score = r.refd == null ? refdOf(r.from_slug, r.to_slug) : null;
      if (score === null) continue;
      const { error } = await svc.from("edge_proposals").update({ refd: score }).eq("id", r.id).eq("status", "pending");
      if (error) throw new Error(`edge_proposals refd: ${error.message}`);
      queued.older_pairs_scored++;
    }
    for (const r of olderPending) {
      const now = inCycle(r);
      if (Boolean(r.in_cycle) === now) continue;
      const { error } = await svc.from("edge_proposals").update({ in_cycle: now }).eq("id", r.id).eq("status", "pending");
      if (error) throw new Error(`edge_proposals cycle flag: ${error.message}`);
      if (now) queued.older_pairs_in_cycle++;
      else queued.older_pairs_out_of_cycle++;
    }
    for (let i = 0; i < outcome.nodeProposals.length; i += 100) {
      const chunk: NodeProposalRow[] = outcome.nodeProposals.slice(i, i + 100);
      const { data, error } = await svc.rpc("merge_node_proposals", { p_rows: chunk });
      if (error) throw new Error(`merge_node_proposals: ${error.message}`);
      queued.node_proposals += chunk.length;
      for (const row of (data as Array<{ key: string; status: string; created_node_id: string | null }>) || []) {
        if (row.status !== "approved" || !row.created_node_id) continue;
        const nodeSlug = rows.find((n) => n.id === row.created_node_id)?.slug;
        const src = chunk.find((c) => c.key === row.key);
        if (!nodeSlug || !src) continue;
        const extra: ProposalRow[] = [];
        for (const t of src.named_by) {
          const target = targetBySlug.get(t);
          if (!target || t === nodeSlug || proposed.has(`${nodeSlug}->${t}`)) continue;
          if (dec.get(row.created_node_id)?.signature.has(target.id)) continue;
          extra.push(
            ...toProposals(target, { irreducible: false, factors: [{ slug: nodeSlug, why: src.reasons[t] ?? "" }], missing: [] }, {
              model,
              hash: `node-proposal:${row.key}`.slice(0, 64),
              verdicts: new Map(),
              verifyModel,
              verifyHash: null,
              impact: impactOf(target.id, dec),
              branchOf,
              origin: "base_idea",
            }),
          );
        }
        for (const p of extra) p.refd = refdOf(p.from_slug, p.to_slug);
        if (extra.length) {
          const { data: d2, error: e2 } = await svc.rpc("merge_edge_proposals", { p_rows: extra });
          if (e2) throw new Error(`merge_edge_proposals: ${e2.message}`);
          queued.from_approved_base_ideas += tallyMerge(d2 as MergeRow[] | null, false);
        }
      }
    }
    const existingIrr = new Map(irreducibleRows.map((r) => [r.node_slug, r]));
    for (const r of irreducible) {
      const prior = existingIrr.get(r.target.slug);
      const act = irreducibleAction(prior ?? null, r.answer.irreducibleWhy ?? "", { model, promptHash: r.hash });
      if (act.op === "insert") {
        const { error } = await svc.from("irreducible_proposals").insert([{ node_slug: r.target.slug, ...act.row }]);
        if (error) throw new Error(`irreducible_proposals: ${error.message}`);
        queued.irreducible++;
      } else if (act.op === "reopen") {
        const { error } = await svc.from("irreducible_proposals").update(act.row).eq("id", prior!.id).eq("status", "rejected");
        if (error) throw new Error(`irreducible_proposals reopen: ${error.message}`);
        queued.irreducible_reopened++;
      }
    }
  }

  const stats = agreementStats(agreement);
  const rate = (rs: ProposalRow[]) => ({ pairs: rs.length, confirmed: rs.filter((r) => r.verification === "confirmed").length });
  const primeTargets = new Set(results.filter((r) => r.target.status === "prime").map((r) => r.target.slug));
  const report = {
    generated_at: new Date().toISOString(),
    models: { proposer: model, verifier: verifyModel, aliases: { proposer: proposerAlias, verifier: verifierAlias }, mismatched },
    targets: targets.length,
    answered: results.length,
    from_cache: results.filter((r) => r.cached).length,
    failures,
    proposals: proposals.length,
    by_origin: {
      proposer: proposals.filter((p) => p.origin === "proposer").length,
      missing_matched: proposals.filter((p) => p.origin === "missing_matched").length,
    },
    confirmed_blind: proposals.filter((p) => p.verification === "confirmed" && !checkedNamed.has(`${p.from_slug}->${p.to_slug}`)).length,
    confirmed_unblinded: proposals.filter((p) => p.verification === "confirmed" && checkedNamed.has(`${p.from_slug}->${p.to_slug}`)).length,
    cross_branch_proposals: proposals.filter((p) => p.cross_branch).length,
    in_cycle: withCycle.filter((p) => p.in_cycle).length,
    agreement: stats,
    refd: { wikipedia: wiki, proposals: refdProposals, blinded: refdBlind, auc: refdAuc },
    confirmation: {
      all: rate(proposals),
      cross_branch: rate(proposals.filter((p) => p.cross_branch)),
      same_branch: rate(proposals.filter((p) => !p.cross_branch)),
      prime_targets: rate(proposals.filter((p) => primeTargets.has(p.to_slug))),
      unfactored_targets: rate(proposals.filter((p) => !primeTargets.has(p.to_slug))),
    },
    missing: {
      named: missing.length,
      groups: groups.length,
      matched_to_existing: outcome.matched.length,
      node_proposals: outcome.nodeProposals.length,
      reused_earlier_keys: reusedKeys,
      matched_pairs_made: proposals.filter((p) => p.origin === "missing_matched").length,
      matched_dropped: matchedDropped,
      reversal_candidates: matchedDropped.filter((d) => d.reason === "rests_on_target"),
      named_by_more_than_one: outcome.nodeProposals.filter((n) => n.named_by.length > 1).length,
    },
    queued,
    skipped,
    irreducible: irreducible.map((r) => ({ slug: r.target.slug, why: r.answer.irreducibleWhy })),
    node_proposals: outcome.nodeProposals.map((n) => ({
      key: n.key,
      title: n.title,
      branch: n.branch,
      named_by: n.named_by.length,
      aliases: n.aliases,
      base_match: n.base_match,
      possible_duplicates: n.possible_duplicates,
    })),
    matched: outcome.matched,
    answers: results.map((r) => ({ slug: r.target.slug, status: r.target.status, branch: r.target.branch, ...r.answer, verdicts: Object.fromEntries(r.verdicts) })),
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "decompose-further.json"), JSON.stringify(report, null, 1));
  const k = stats.kappa === null ? "n/a" : stats.kappa.toFixed(3);
  const ci = stats.kappaInterval ? `[${stats.kappaInterval[0].toFixed(3)}, ${stats.kappaInterval[1].toFixed(3)}]` : "n/a";
  console.log(
    `[decompose-further] answered ${results.length}/${targets.length} (${report.from_cache} from cache), ${failures.length} failed; ` +
      `${proposals.length} proposals (${report.by_origin.missing_matched} from matched missing ideas), ${report.confirmation.all.confirmed} confirmed, ` +
      `${report.cross_branch_proposals} across branches, ${report.in_cycle} in a cycle`,
  );
  console.log(`[decompose-further] blinded agreement: ${stats.pairs} pairs over ${stats.targets} targets, kappa ${k}, 95% interval ${ci}, table ${JSON.stringify(stats.table)}`);
  const iv = (a: ReturnType<typeof refdAucInterval>) =>
    a.auc === null ? "n/a" : `${a.auc}${a.interval ? ` [${a.interval[0]}, ${a.interval[1]}]` : ""}`;
  const share = (t: ReturnType<typeof refdAgreement>, a: ReturnType<typeof refdAucInterval>) =>
    t.pairs ? `${t.pairs} pairs, mean ${t.confirmed.mean ?? "n/a"} confirmed and ${t.refuted.mean ?? "n/a"} refuted, AUC ${iv(a)}` : "no scored pairs";
  console.log(
    `[decompose-further] Wikipedia: ${wiki.mapped} nodes mapped (${wiki.via_corpus} from the corpus), ${wiki.articles} articles, ${wiki.requests} requests${wiki.error ? `, error: ${wiki.error}` : ""}; ` +
      `RefD against the verifier: proposals ${share(refdProposals, refdAuc.proposals)}, blinded set ${share(refdBlind, refdAuc.blinded)} ` +
      `(picks ${iv(refdAuc.blinded_picks)}, passed over ${iv(refdAuc.blinded_passed_over)})`,
  );
  console.log(
    `[decompose-further] missing ideas: ${missing.length} named; ${outcome.matched.length} matched an existing node, giving ${report.missing.matched_pairs_made} pairs and ${matchedDropped.length} drops ` +
      `(${matchedDropped.filter((d) => d.reason === "rests_on_target").length} read an existing edge backward); ${outcome.nodeProposals.length} missing ideas; ${irreducible.length} called irreducible`,
  );
  for (const m of outcome.nodeProposals.slice(0, 15)) console.log(`  ${m.named_by.length}\t${m.title}\t${m.branch}${m.aliases.length ? `\t(also ${m.aliases.slice(0, 3).join("; ")})` : ""}`);
  if (failures.length) console.log(`[decompose-further] first failure: ${failures[0].slug}: ${failures[0].reason}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
