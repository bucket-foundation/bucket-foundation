"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deckLabel, loadCorpus, loadDecks } from "@/lib/academy/corpus-client";
import { masteryFor, type Atom } from "@/lib/academy/engine";
import { MASTERED_THRESHOLD } from "@/lib/academy/mastery";
import { loadBranch, pullServer } from "@/lib/academy/progress-store";
import { graphFromAtoms, planPath, repairMastery, type PathError } from "@/lib/academy/prereq-path";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LINK, LoadingState, PageHeader, Panel } from "@/components/ui";

interface Loaded {
  atoms: Map<string, Atom & { branch: string; branchLabel: string }>;
  mastered: Set<string>;
}

const SHELL_RANK: Record<string, number> = { prereq: 0, nucleus: 1, frontier: 2 };

async function loadAll(): Promise<Loaded> {
  const [decks, server] = await Promise.all([loadDecks(), pullServer()]);
  const atoms: Loaded["atoms"] = new Map();
  const mastered = new Set<string>();
  for (const d of decks) {
    const [c, s] = await Promise.all([loadCorpus(d.id), loadBranch(d.id, server)]);
    if (!c) continue;
    for (const a of c.atoms) {
      if (!atoms.has(a.id)) atoms.set(a.id, { ...a, branch: d.id, branchLabel: deckLabel(d) });
      if (masteryFor(s, a.id) >= MASTERED_THRESHOLD) mastered.add(a.id);
    }
  }
  return { atoms, mastered };
}

function describe(error: PathError, title: (id: string) => string): string {
  if (error.kind === "MissingNode") return error.requiredBy ? `${title(error.requiredBy)} requires ${error.id}, which is not in the graph.` : `${error.id} is not in the graph.`;
  if (error.kind === "Cycle") return `The prerequisite graph has a cycle through ${error.nodes.map(title).join(", ")}.`;
  return "Some concepts are marked mastered while one of their prerequisites is not.";
}

export default function PathView() {
  const router = useRouter();
  const params = useSearchParams();
  const to = params.get("to") ?? "";
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState(to);
  const [repaired, setRepaired] = useState(false);

  useEffect(() => {
    let alive = true;
    loadAll().then((d) => alive && setData(d)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setQuery(to);
    setRepaired(false);
  }, [to]);

  const graph = useMemo(() => (data ? graphFromAtoms(Array.from(data.atoms.values())) : null), [data]);
  const title = (id: string) => data?.atoms.get(id)?.title ?? id;
  const rank = (id: string) => SHELL_RANK[data?.atoms.get(id)?.shell ?? "nucleus"] ?? 1;

  const repair = useMemo(() => (graph && data && to ? repairMastery(graph, to, data.mastered) : null), [graph, data, to]);
  const mastery = repaired && repair ? repair.mastered : data?.mastered;
  const result = useMemo(() => (graph && mastery && to ? planPath(graph, to, mastery, rank) : null), [graph, mastery, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => {
    if (!data || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return Array.from(data.atoms.values()).filter((a) => a.id.toLowerCase().includes(q) || a.title.toLowerCase().includes(q)).slice(0, 8);
  }, [data, query]);

  if (failed) return <ErrorState title="The decks did not load" body="The corpus files are missing from this deployment." />;
  if (!data || !graph) return <LoadingState label="Loading the prerequisite graph" />;

  const target = data.atoms.get(to);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research OS · learn · path"
        title="path to a concept"
        lede="Pick any concept. The path lists every prerequisite you have not mastered, foundations first, and nothing else."
      />

      <Panel title="concept">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search by name or id"
          aria-label="Search concepts"
          className="w-full border border-[color:var(--basalt-3)] bg-transparent px-3 py-2 text-[14px]"
        />
        {matches.length > 0 && query !== to && (
          <ul className="mt-2 flex flex-col gap-1 text-[13px]">
            {matches.map((a) => (
              <li key={a.id}>
                <button type="button" className={LINK} onClick={() => router.push(`/research-os/learn/path?to=${encodeURIComponent(a.id)}`)}>
                  {a.title}
                </button>
                <span className="ml-2 text-[color:var(--basalt-3)]">{a.branchLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {!to ? (
        <EmptyState title="No concept picked" body="Search above to see the ordered path to it." />
      ) : !target || !result ? (
        <ErrorState title="Unknown concept" body={`${to} is not in any deck.`} />
      ) : !result.ok && result.error.kind === "MasteryConflict" ? (
        <Panel title="mastery conflict">
          <p className="text-[13px] leading-[1.6]">{describe(result.error, title)}</p>
          <ul className="mt-2 text-[13px] list-disc pl-5">
            {result.error.conflicts.map((c) => (
              <li key={c.id}>
                {title(c.id)} is mastered, but {c.missing.map(title).join(", ")} is not.
              </li>
            ))}
          </ul>
          {repair && repair.demoted.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={BTN_PRIMARY} onClick={() => setRepaired(true)}>
                demote {repair.demoted.length} and plan
              </button>
              <span className="text-[12px] text-[color:var(--basalt-3)]">Treats {repair.demoted.map(title).join(", ")} as not mastered for this path. Your progress is unchanged.</span>
            </div>
          )}
        </Panel>
      ) : !result.ok ? (
        <ErrorState title="No path" body={describe(result.error, title)} />
      ) : (
        <Panel title={target.title} meta={`${result.steps.length} to learn · ${result.mastered.length} mastered`}>
          {repaired && repair && (
            <p className="mb-3 text-[12px] text-[color:var(--basalt-3)]">
              Planned with {repair.demoted.map(title).join(", ")} demoted.{" "}
              <button type="button" className={LINK} onClick={() => setRepaired(false)}>undo</button>
            </p>
          )}
          {result.steps.length === 0 ? (
            <p className="text-[13px]">You have mastered this concept and every prerequisite.</p>
          ) : (
            <ol className="flex flex-col gap-2 text-[13px] list-decimal pl-5">
              {result.steps.map((id) => {
                const a = data.atoms.get(id)!;
                return (
                  <li key={id}>
                    <Link href={`/research-os/learn/${a.branch}/${encodeURIComponent(id)}`} className={LINK}>{a.title}</Link>
                    <span className="ml-2 text-[color:var(--basalt-3)]">{a.branchLabel}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {result.mastered.length > 0 && (
            <details className="mt-4 text-[12px] text-[color:var(--basalt-3)]">
              <summary>{result.mastered.length} mastered prerequisites</summary>
              <p className="mt-1">{result.mastered.map(title).join(", ")}</p>
            </details>
          )}
          <p className="mt-4 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">
            This path is minimal for the reviewed prerequisite graph. Edges still under review may add prerequisites.
          </p>
          <div className="mt-4">
            <Link href={`/research-os/learn/${target.branch}`} className={BTN_SECONDARY}>open {target.branchLabel}</Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
