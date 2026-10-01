import { useCallback, useEffect, useMemo, useState } from "react";
import { masteryFor } from "@academy/engine";
import { gripSphere } from "@academy/grip-sphere";
import { MASTERED_THRESHOLD } from "@academy/mastery";
import { graphFromAtoms, planPath, repairMastery, type PathError } from "@academy/prereq-path";
import { bareBranch } from "@/components/canon-globe/projections";
import type { Api } from "../api";
import { href } from "../router";
import { GripPanel } from "./Grip";
import { loadLearnData, type LearnData } from "./learn-data";
import { layoutTopics, STATE_LABEL, STATE_MEANING, topicStates, type TopicState } from "./path-graph";
import { TopicGraph } from "./TopicGraph";
import "../path.css";

const SHELL_RANK: Record<string, number> = { prereq: 0, nucleus: 1, frontier: 2 };
const STATES: TopicState[] = ["known", "due", "new", "locked"];

export const MISSING_TOPIC = "This needs a topic Bucket does not have yet.";
export const UNKNOWN_TOPIC = "Bucket does not have that topic yet.";
export const TOPIC_CYCLE = "Some topics wait on each other.";
export const MASTERY_UNSURE = "Bucket is unsure what you already know here.";
export const NO_TOPICS = "Bucket has no topics yet.";
export const GRIP_CAPTION = "The sphere shows how much of each branch you hold today.";
export const PICK_A_TOPIC = "Pick a topic on the map to see what it needs first and what it opens next.";

function describe(error: PathError): string {
  if (error.kind === "MissingNode") return MISSING_TOPIC;
  if (error.kind === "Cycle") return TOPIC_CYCLE;
  return MASTERY_UNSURE;
}

export function PathView({ api, to, now }: { api: Api; to?: string; now?: number }) {
  const [data, setData] = useState<LearnData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [repaired, setRepaired] = useState(false);
  const [selected, setSelected] = useState<string | null>(to ?? null);
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    loadLearnData(api).then(setData, (e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => setSelected(to ?? null), [to]);
  useEffect(() => setRepaired(false), [selected]);

  const graph = useMemo(() => (data ? graphFromAtoms(Array.from(data.atoms.values())) : null), [data]);
  const deckOrder = useMemo(() => new Map((data?.decks ?? []).map((d, i) => [d.id, i])), [data]);
  const layout = useMemo(() => (graph && data ? layoutTopics(graph, undefined, (id) => deckOrder.get(data.atoms.get(id)?.deck ?? "") ?? 0) : null), [graph, data, deckOrder]);
  const states = useMemo(() => (data ? topicStates(data, now) : new Map<string, TopicState>()), [data, now]);
  const grip = useMemo(() => (data ? gripSphere(data.decks.map((d) => ({ branch: d.id, atomIds: data.byDeck.get(d.id) ?? [], state: data.states.get(d.id) ?? null }))) : null), [data]);
  const mastered = useMemo(() => {
    const out = new Set<string>();
    if (!data) return out;
    for (const a of data.atoms.values()) if (masteryFor(data.states.get(a.deck)!, a.id) >= MASTERED_THRESHOLD) out.add(a.id);
    return out;
  }, [data]);
  const title = useCallback((id: string) => data?.atoms.get(id)?.title ?? "A topic Bucket does not have yet", [data]);
  const branchOf = useCallback((id: string) => bareBranch(data?.atoms.get(id)?.deck ?? ""), [data]);
  const rank = (id: string) => SHELL_RANK[data?.atoms.get(id)?.shell ?? "nucleus"] ?? 1;
  const repair = useMemo(() => (graph && selected ? repairMastery(graph, selected, mastered) : null), [graph, selected, mastered]);
  const plan = useMemo(
    () => (graph && selected ? planPath(graph, selected, repaired && repair ? repair.mastered : mastered, rank) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, selected, mastered, repaired, repair],
  );
  const matches = useMemo(() => {
    if (!data || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return Array.from(data.atoms.values())
      .filter((a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
      .slice(0, 8);
  }, [data, query]);

  const target = selected && data ? data.atoms.get(selected) : undefined;
  const lit = target ? branchOf(target.id) : branch;
  const dimmed = useMemo(() => {
    const out = new Set<string>();
    if (!data || !branch) return out;
    for (const a of data.atoms.values()) if (bareBranch(a.deck) !== branch) out.add(a.id);
    return out;
  }, [data, branch]);
  const focus = useMemo(() => {
    const all = layout ? Array.from(layout.nodes.keys()) : [];
    const inBranch = branch ? all.filter((id) => !dimmed.has(id)) : all;
    const next = inBranch.filter((id) => states.get(id) === "due" || states.get(id) === "new");
    return { key: branch ?? "", ids: next.length ? next : inBranch };
  }, [layout, branch, dimmed, states]);

  const pick = useCallback((id: string | null) => {
    setSelected(id);
    window.location.hash = href(id ? { name: "path", to: id } : { name: "path" });
  }, []);
  const pickBranch = useCallback(
    (b: string | null) => {
      setBranch(b);
      if (b && selected && branchOf(selected) !== b) pick(null);
    },
    [selected, branchOf, pick],
  );
  const select = useCallback(
    (id: string) => {
      setBranch((b) => (b && branchOf(id) !== b ? null : b));
      pick(id);
    },
    [branchOf, pick],
  );

  if (error) return <p className="error">{error}</p>;
  if (!data || !graph || !layout) return <p className="muted">Loading topics…</p>;

  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const linked = (ids: string[]) => (
    <ul className="linked">
      {ids.map((id) => (
        <li key={id}>
          <button className="link" onClick={() => select(id)}>
            {title(id)}
          </button>
          <span className={`state-tag ${states.get(id) ?? "locked"}`}>{STATE_LABEL[states.get(id) ?? "locked"]}</span>
        </li>
      ))}
    </ul>
  );
  const sentence = (ids: string[]) => ids.map(title).join(", ");

  return (
    <section>
      <header className="head">
        <h1>Path</h1>
        <p className="muted">Every topic and the topics it rests on. Pick one to see what to learn first.</p>
      </header>
      {selected && !target && <p className="error">{UNKNOWN_TOPIC}</p>}
      {layout.cyclic && <p className="error">{TOPIC_CYCLE}</p>}
      {layout.nodes.size === 0 ? (
        <p className="panel muted">{NO_TOPICS}</p>
      ) : (
        <>
          <div className="path-grid">
            <div className="map-side">
              <div className="panel list">
                <input className="search" aria-label="Find a topic by its title" placeholder="Find a topic, such as entropy or the Schrödinger equation" value={query} onChange={(e) => setQuery(e.target.value)} />
                {matches.length > 0 && (
                  <ul className="matches">
                    {matches.map((a) => (
                      <li key={a.id}>
                        <a
                          href={href({ name: "path", to: a.id })}
                          onClick={() => {
                            setQuery("");
                            select(a.id);
                          }}
                        >
                          {a.title}
                          <span className="muted small"> {a.deckTitle}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="panel map-panel">
                <p className="muted small">{`${count(layout.nodes.size, "topic", "topics")} joined by ${count(layout.edges.length, "link", "links")}.`}</p>
                <ul className="legend">
                  {STATES.map((s) => (
                    <li key={s} className={`state-tag ${s}`}>
                      <b>{STATE_LABEL[s]}</b> <span className="muted">{STATE_MEANING[s]}</span>
                    </li>
                  ))}
                </ul>
                <TopicGraph layout={layout} title={title} states={states} selected={target ? target.id : null} dimmed={dimmed} focus={focus} onSelect={select} />
              </div>
            </div>
            <div className="map-side">
              {grip && grip.axes.length > 0 && <GripPanel grip={grip} caption={GRIP_CAPTION} picked={lit} onPick={pickBranch} />}
              <aside className="panel topic-panel" aria-live="polite">
                {!target ? (
                  <p className="muted">{PICK_A_TOPIC}</p>
                ) : (
                  <div className="path">
                    <h2>{target.title}</h2>
                    <p className="muted small">
                      {target.deckTitle} · {STATE_LABEL[states.get(target.id) ?? "locked"]}. {STATE_MEANING[states.get(target.id) ?? "locked"]}
                    </p>
                    <a className="primary start" href={href({ name: "deck", deck: target.deck, atom: target.id })}>
                      Start this topic in Learn
                    </a>
                    <h3>Needs first</h3>
                    {(layout.needs.get(target.id) ?? []).length ? linked(layout.needs.get(target.id)!) : <p className="muted small">Nothing. You can start here.</p>}
                    <h3>Opens next</h3>
                    {(layout.opens.get(target.id) ?? []).length ? linked(layout.opens.get(target.id)!) : <p className="muted small">Nothing yet.</p>}
                    <h3>Learn in this order</h3>
                    {!plan ? null : !plan.ok ? (
                      <>
                        {!(plan.error.kind === "Cycle" && layout.cyclic) && <p className="error">{describe(plan.error)}</p>}
                        {plan.error.kind === "Cycle" && layout.cyclic && <p className="muted small">Bucket cannot put these in order until that is fixed.</p>}
                        {plan.error.kind === "MasteryConflict" && repair && repair.demoted.length > 0 && !repaired && (
                          <button className="ghost" onClick={() => setRepaired(true)}>
                            Plan with {repair.demoted.length} {repair.demoted.length === 1 ? "topic" : "topics"} to study again
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
                  </div>
                )}
              </aside>
            </div>
          </div>
          <details className="panel links-list">
            <summary>Read the same links as a list</summary>
            <ul>
              {layout.columns.flat().map((id) => (
                <li key={id}>
                  <button className="link" onClick={() => select(id)}>
                    {title(id)}
                  </button>
                  . {STATE_LABEL[states.get(id) ?? "locked"]}. {layout.needs.get(id)!.length ? `Needs ${sentence(layout.needs.get(id)!)}.` : "Needs nothing first."}{" "}
                  {layout.opens.get(id)!.length ? `Opens ${sentence(layout.opens.get(id)!)}.` : "Opens nothing yet."}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
