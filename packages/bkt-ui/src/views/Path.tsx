import { useEffect, useMemo, useState } from "react";
import { masteryFor } from "@academy/engine";
import { MASTERED_THRESHOLD } from "@academy/mastery";
import { graphFromAtoms, planPath, repairMastery, type PathError } from "@academy/prereq-path";
import type { Api } from "../api";
import { href } from "../router";
import { loadLearnData, type LearnData } from "./learn-data";

const SHELL_RANK: Record<string, number> = { prereq: 0, nucleus: 1, frontier: 2 };

function describe(error: PathError, title: (id: string) => string): string {
  if (error.kind === "MissingNode") return error.requiredBy ? `${title(error.requiredBy)} requires ${error.id}, which is not in the graph.` : `${error.id} is not in the graph.`;
  if (error.kind === "Cycle") return `The prerequisite graph has a cycle through ${error.nodes.map(title).join(", ")}.`;
  return "Some concepts are marked mastered while one of their prerequisites is not.";
}

export function PathView({ api, to }: { api: Api; to?: string }) {
  const [data, setData] = useState<LearnData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [repaired, setRepaired] = useState(false);

  useEffect(() => {
    loadLearnData(api).then(setData, (e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => setRepaired(false), [to]);

  const graph = useMemo(() => (data ? graphFromAtoms(Array.from(data.atoms.values())) : null), [data]);
  const mastered = useMemo(() => {
    const out = new Set<string>();
    if (!data) return out;
    for (const a of data.atoms.values()) if (masteryFor(data.states.get(a.deck)!, a.id) >= MASTERED_THRESHOLD) out.add(a.id);
    return out;
  }, [data]);
  const title = (id: string) => data?.atoms.get(id)?.title ?? id;
  const rank = (id: string) => SHELL_RANK[data?.atoms.get(id)?.shell ?? "nucleus"] ?? 1;
  const repair = useMemo(() => (graph && to ? repairMastery(graph, to, mastered) : null), [graph, to, mastered]);
  const plan = useMemo(
    () => (graph && to ? planPath(graph, to, repaired && repair ? repair.mastered : mastered, rank) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, to, mastered, repaired, repair],
  );
  const matches = useMemo(() => {
    if (!data || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return Array.from(data.atoms.values())
      .filter((a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
      .slice(0, 8);
  }, [data, query]);

  if (error) return <p className="error">{error}</p>;
  if (!data || !graph) return <p className="muted">Loading the prerequisite graph…</p>;
  const target = to ? data.atoms.get(to) : undefined;

  return (
    <section>
      <header className="head">
        <h1>Path</h1>
        <p className="muted">Pick a concept. Bucket lists what to learn first, in order, across every deck.</p>
      </header>
      <div className="panel list">
        <input className="search" placeholder="Find a concept, such as entropy or the Schrödinger equation" value={query} onChange={(e) => setQuery(e.target.value)} />
        {matches.length > 0 && (
          <ul className="matches">
            {matches.map((a) => (
              <li key={a.id}>
                <a href={href({ name: "path", to: a.id })} onClick={() => setQuery("")}>
                  {a.title}
                  <span className="muted small"> {a.deckTitle}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {to && !target && <p className="error">{to} is not in the graph.</p>}
      {target && plan && (
        <article className="panel card path">
          <h2>{target.title}</h2>
          {!plan.ok ? (
            <>
              <p className="error">{describe(plan.error, title)}</p>
              {plan.error.kind === "MasteryConflict" && repair && repair.demoted.length > 0 && !repaired && (
                <button className="ghost" onClick={() => setRepaired(true)}>
                  Treat {repair.demoted.length} of them as not mastered
                </button>
              )}
            </>
          ) : plan.steps.length === 0 ? (
            <p>You have mastered this and everything it rests on.</p>
          ) : (
            <>
              <p className="muted">
                {plan.steps.length} to learn, {plan.mastered.length} already mastered.
              </p>
              <ol className="steps-list">
                {plan.steps.map((id, i) => {
                  const a = data.atoms.get(id);
                  return (
                    <li key={id} className={id === target.id ? "goal" : ""}>
                      <span className="n">{i + 1}</span>
                      <span className="who">
                        {title(id)}
                        <span className="muted small">{a?.deckTitle}</span>
                      </span>
                      {a && (
                        <a className="go" href={href({ name: "deck", deck: a.deck, atom: id })}>
                          Study
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </article>
      )}
    </section>
  );
}
