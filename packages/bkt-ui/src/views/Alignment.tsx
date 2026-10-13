import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Atom } from "@academy/engine";
import type { Api, ResearchDetail, ReviewRow } from "../api";
import { applyDecision, atomParts, atomState, cleanReviewer, decisionKey, deckProgress, mergeDecisions, parseDecisions, parseOpinions, parseEdges, parseLinks, qualityLine, qualitySamples, queuedAtoms, QUEUES, REASONS, REVIEW_SCHEMA, REVIEW_SLUG, today, UNREVIEWED, verifiedTable, type Decision, type DecisionKind, type Edge, type Link, type Queue, type Reason } from "../alignment";
import { holdPendingSave } from "../pending-saves";
import type { ResearchApi } from "./Research";

export type AlignmentApi = ResearchApi & Pick<Api, "decks" | "atoms" | "alignmentRows" | "alignmentSearch">;

export const REVIEWER_KEY = "bucket.review.name";
export const NO_QUEUE = "This copy of Bucket holds no review queue.";
export const NEED_NAME = "Type your name first. It is written beside each decision.";
export const NO_LABEL = "This source lets Bucket show its code and its link alone. Open the source to read it.";
export const KEYS_HINT = "Keys: J and K move between links. 1 right, 2 partly, 3 wrong, X clears. 0 marks that no match exists. N and P move between atoms. Slash goes to the search box.";
export const QUEUE_LABELS: Record<Queue, string> = { "review-first": "Prerequisite queue, first", "review-second": "Prerequisite queue, second" };
const REASON_KEYS = ["a", "b", "c", "d"];

interface Loaded {
  d: ResearchDetail;
  links: Link[];
  edges: Edge[];
  paths: { links: string; decisions: string };
  quality: string;
}

function nameStore(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function AlignmentPane({ api }: { api: AlignmentApi }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [absent, setAbsent] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [deck, setDeck] = useState<string | null>(null);
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [atom, setAtom] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queue | "all">("all");
  const [cursor, setCursor] = useState(0);
  const [partly, setPartly] = useState(false);
  const [rows, setRows] = useState<Record<string, ReviewRow>>({});
  const [reviewer, setReviewer] = useState(() => cleanReviewer(nameStore()?.getItem(REVIEWER_KEY) ?? ""));
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ReviewRow[] | null>(null);
  const [exported, setExported] = useState<{ dir: string; files: string[]; verified: number } | null>(null);
  const held = useRef({ text: "", rev: "", saved: "", path: "" });
  const chain = useRef<Promise<void>>(Promise.resolve());

  const pump = () => {
    chain.current = chain.current.then(async () => {
      while (held.current.path && held.current.text !== held.current.saved) {
        const body = held.current.text;
        try {
          let r = await api.researchSave(REVIEW_SLUG, held.current.path, held.current.rev, body);
          if (!r.saved) r = await api.researchSave(REVIEW_SLUG, held.current.path, r.current, body);
          if (!r.saved) return setStatus("This review changed in another window. Open the queue again.");
          held.current = { ...held.current, rev: r.rev, saved: body };
          setStatus(null);
        } catch (e) {
          return setStatus((e as Error).message);
        }
      }
    });
    return chain.current;
  };

  useEffect(() => {
    const release = holdPendingSave(() => void pump());
    return () => {
      release();
      void pump();
    };
  }, []);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const d = await api.researchManifest(REVIEW_SLUG);
      const path = (id: string) => (d.manifest.tables ?? []).find((t) => t.id === id)?.path;
      const paths = { links: path("alignments"), edges: path("edges"), decisions: path("decisions") };
      if (!paths.links || !paths.edges || !paths.decisions) throw new Error(NO_QUEUE);
      const measured = path("quality");
      const [linksText, edgesText, own, decks, qualityText] = await Promise.all([api.researchText(REVIEW_SLUG, paths.links), api.researchText(REVIEW_SLUG, paths.edges), api.researchSource(REVIEW_SLUG, paths.decisions), api.decks(), measured ? api.researchText(REVIEW_SLUG, measured).catch(() => "") : Promise.resolve("")]);
      if (!live) return;
      held.current = { text: own.text, rev: own.rev, saved: own.text, path: paths.decisions };
      setText(own.text);
      setTitles(Object.fromEntries(decks.map((x) => [x.id, x.title])));
      setLoaded({ d, links: parseLinks(linksText), edges: parseEdges(edgesText), paths: { links: paths.links, decisions: paths.decisions }, quality: qualityLine(qualitySamples(qualityText, paths.links)) });
    })().catch((e: Error & { status?: number }) => live && setAbsent(e.status === 404 || e.message === NO_QUEUE ? NO_QUEUE : e.message));
    return () => {
      live = false;
    };
  }, [api]);

  useEffect(() => {
    if (!deck) return setAtoms([]);
    let live = true;
    api.atoms(deck).then(
      (a) => live && setAtoms(a),
      () => live && setAtoms([]),
    );
    return () => {
      live = false;
    };
  }, [api, deck]);

  const decisions = useMemo(() => new Map(parseDecisions(text).map((d) => [decisionKey(d), d])), [text]);
  const opinions = useMemo(() => parseOpinions(text), [text]);
  const progress = useMemo(() => (loaded ? deckProgress(loaded.links, decisions) : []), [loaded, decisions]);
  const queued = useMemo(() => (loaded && queue !== "all" ? queuedAtoms(loaded.edges, queue) : null), [loaded, queue]);
  const deckAtoms = useMemo(() => {
    if (!loaded || !deck) return [];
    const ids: string[] = [];
    for (const l of loaded.links) if (atomParts(l.atom)!.deck === deck && !ids.includes(l.atom)) ids.push(l.atom);
    return queued ? ids.filter((id) => queued.has(id)) : ids;
  }, [loaded, deck, queued]);
  const state = useMemo(() => (loaded && atom ? atomState(atom, loaded.links, decisions) : null), [loaded, atom, decisions]);

  useEffect(() => {
    if (!state) return;
    const ids = [...new Set([...state.links.map((l) => l.row as string), ...state.added.map((d) => d.row as string)])].filter((id) => id && !rows[id]);
    if (ids.length === 0) return;
    let live = true;
    api.alignmentRows(ids).then(
      (r) => live && setRows((now) => ({ ...now, ...Object.fromEntries(r.rows.map((row) => [row.id, row])) })),
      (e: Error) => live && setStatus(e.message),
    );
    return () => {
      live = false;
    };
  }, [api, state]);

  useEffect(() => {
    setCursor(0);
    setPartly(false);
    setHits(null);
    setQ("");
    root.current?.focus();
  }, [atom]);

  if (absent) return <p className="muted">{absent}</p>;
  if (!loaded) return <p className="muted">Opening the review queue…</p>;

  const put = (body: string) => {
    held.current = { ...held.current, text: body };
    setText(body);
    setExported(null);
    void pump();
  };

  const save = (next: Decision | { remove: string }) => put(applyDecision(held.current.text, next));

  const bringIn = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return setStatus("That file is larger than a review can be.");
    const merged = mergeDecisions(held.current.text, await file.text());
    put(merged.text);
    setNote(`Brought in ${merged.added.toLocaleString("en-US")} ${merged.added === 1 ? "opinion" : "opinions"} from another review. Each shows beside its link and decides nothing: a link counts only when you mark it yourself. ${merged.differing.toLocaleString("en-US")} ${merged.differing === 1 ? "differs" : "differ"} from a decision of yours.`);
  };

  const decide = (kind: DecisionKind, target: { link: string | null; row: string | null }, reason: Reason | null = null) => {
    if (!atom) return;
    if (!reviewer) return setStatus(NEED_NAME);
    save({ schema: REVIEW_SCHEMA, atom, link: target.link, row: target.row, decision: kind, reason, reviewer, at: today() });
  };

  const move = (step: number) => {
    const at = deckAtoms.indexOf(atom ?? "");
    const next = deckAtoms[at + step];
    if (next) setAtom(next);
  };

  const find = async () => {
    if (!deck || !q.trim()) return setHits(null);
    try {
      setHits((await api.alignmentSearch(deck, q.trim())).rows);
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (!state || !atom || e.ctrlKey || e.metaKey || e.altKey || el.closest("input, textarea, select")) return;
    const link = state.links[cursor];
    const key = e.key.toLowerCase();
    const done = () => e.preventDefault();
    if (partly && link && REASON_KEYS.includes(key)) {
      decide("partly", { link: link.id, row: link.row }, REASONS[REASON_KEYS.indexOf(key)]);
      setPartly(false);
      return done();
    }
    if (key === "j" || e.key === "ArrowDown") {
      setCursor((c) => Math.min(state.links.length - 1, c + 1));
      setPartly(false);
    } else if (key === "k" || e.key === "ArrowUp") {
      setCursor((c) => Math.max(0, c - 1));
      setPartly(false);
    } else if (key === "1" && link) decide("right", { link: link.id, row: link.row });
    else if (key === "2" && link) setPartly(true);
    else if (key === "3" && link) decide("wrong", { link: link.id, row: link.row });
    else if (key === "x" && link) save({ remove: `${atom}|${link.id}` });
    else if (key === "0") state.none ? save({ remove: `${atom}|none` }) : decide("no-match", { link: null, row: null });
    else if (key === "n" || e.key === "ArrowRight") move(1);
    else if (key === "p" || e.key === "ArrowLeft") move(-1);
    else if (e.key === "/") search.current?.focus();
    else return;
    done();
  };

  const exportReview = async () => {
    setStatus(null);
    try {
      await pump();
      const all = parseDecisions(held.current.text);
      const changes = await api.researchChanges(REVIEW_SLUG);
      if (changes.changes.some((c) => c.path === loaded.paths.links)) await api.researchRevert(REVIEW_SLUG, loaded.paths.links);
      const shipped = await api.researchSource(REVIEW_SLUG, loaded.paths.links);
      const next = verifiedTable(shipped.text, all);
      if (next.verified > 0) {
        const r = await api.researchSave(REVIEW_SLUG, loaded.paths.links, shipped.rev, next.text);
        if (!r.saved) throw new Error("The links changed while the export ran. Try again.");
      }
      const made = await api.researchExport(REVIEW_SLUG);
      setExported({ dir: made.dir, files: made.files, verified: next.verified });
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const title = (id: string) => atoms.find((a) => a.id === atomParts(id)?.slug)?.title ?? atomParts(id)?.slug ?? id;
  const shownAtom = atom ? atoms.find((a) => a.id === atomParts(atom)?.slug) : undefined;
  const atomTitle = atom ? (shownAtom?.title ?? title(atom)) : "";
  const total = progress.reduce((n, p) => n + p.links, 0);
  const decided = progress.reduce((n, p) => n + p.decided, 0);

  return (
    <div className="alignment" ref={root} tabIndex={-1} onKeyDown={onKey}>
      <div className="toolbar">
        <label>
          Your name{" "}
          <input
            type="text"
            value={reviewer}
            maxLength={80}
            aria-label="Your name, written beside each decision"
            onChange={(e) => {
              const name = cleanReviewer(e.target.value);
              setReviewer(e.target.value.endsWith(" ") ? `${name} ` : name);
              nameStore()?.setItem(REVIEWER_KEY, name);
            }}
          />
        </label>
        <select value={queue} aria-label="Which atoms to show" onChange={(e) => setQueue(e.target.value as Queue | "all")}>
          <option value="all">Every atom</option>
          {QUEUES.map((x) => (
            <option key={x} value={x}>
              {QUEUE_LABELS[x]}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void exportReview()} disabled={decisions.size === 0}>
          Export the review
        </button>
        <label className="file">
          <input type="file" accept=".jsonl,application/x-ndjson,text/plain" aria-label="Bring in another review" onChange={(e) => void bringIn(e.target.files?.[0])} />
          <span>Bring in another review</span>
        </label>
        <span className="muted" role="status">
          {decided.toLocaleString("en-US")} of {total.toLocaleString("en-US")} links decided
        </span>
      </div>
      <p className="banner alignment-quality" role="note">
        {UNREVIEWED} {loaded.quality}
      </p>
      {status && (
        <p className="banner" role="alert">
          {status}
        </p>
      )}
      {note && (
        <p className="muted alignment-note" role="status">
          {note}
        </p>
      )}
      {exported && (
        <div className="panel alignment-export" role="status">
          <p>
            Exported. {exported.verified.toLocaleString("en-US")} {exported.verified === 1 ? "link is" : "links are"} marked verified in the copy, each with your name and the date.
          </p>
          <details className="fine">
            <summary>Where it is and what it holds</summary>
            <p>{exported.dir}</p>
            <ul>
              {exported.files.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
      {!deck ? (
        <div className="panel">
          <table className="alignment-decks">
            <thead>
              <tr>
                <th>Deck</th>
                <th>Atoms done</th>
                <th>Links decided</th>
                <th>Marked right</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p) => (
                <tr key={p.deck}>
                  <td>
                    <button type="button" className="link" onClick={() => { setDeck(p.deck); setAtom(null); }}>
                      {titles[p.deck] ?? p.deck}
                    </button>
                  </td>
                  <td>
                    {p.done} of {p.atoms}
                    <progress value={p.done} max={p.atoms} aria-label={`Atoms done in ${titles[p.deck] ?? p.deck}`} />
                  </td>
                  <td>
                    {p.decided} of {p.links}
                  </td>
                  <td>{p.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alignment-split">
          <div className="panel alignment-atoms">
            <button type="button" className="link" onClick={() => { setDeck(null); setAtom(null); }}>
              All decks
            </button>
            <h3>{titles[deck] ?? deck}</h3>
            {deckAtoms.length === 0 && <p className="muted">No atom of this deck is in that queue.</p>}
            <ol>
              {deckAtoms.map((id) => {
                const s = atomState(id, loaded.links, decisions);
                return (
                  <li key={id}>
                    <button type="button" className={id === atom ? "on" : ""} aria-current={id === atom ? "true" : undefined} onClick={() => setAtom(id)}>
                      <span>{title(id)}</span>
                      <span className="muted small">{s.done ? "Done" : s.links.length ? `${s.decided} of ${s.links.length}` : "No link proposed"}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="panel alignment-atom">
            {!atom || !state ? (
              <p className="muted">Choose an atom. {KEYS_HINT}</p>
            ) : (
              <>
                <h3>{atomTitle}</h3>
                {shownAtom?.summary && <p className="alignment-statement">{shownAtom.summary}</p>}
                <p className="muted small">{KEYS_HINT}</p>
                {state.links.length === 0 && <p className="muted">No link is proposed for this atom. Add one below, or mark that no match exists.</p>}
                <ol className="alignment-links">
                  {state.links.map((l, i) => {
                    const row = l.row ? rows[l.row] : undefined;
                    const made = decisions.get(`${atom}|${l.id}`);
                    return (
                      <li key={l.id} className={i === cursor ? "on" : ""} aria-current={i === cursor ? "true" : undefined} onClick={() => setCursor(i)}>
                        <p className="muted small alignment-kind">Proposed link, unreviewed</p>
                        <p className="alignment-label">{row?.label ?? <span className="muted">{NO_LABEL}</span>}</p>
                        <dl className="alignment-facts">
                          <div><dt>Code</dt><dd>{row?.code ?? l.code ?? "None"}</dd></div>
                          <div><dt>Level of the row</dt><dd>{l.level ?? "None"}</dd></div>
                          <div><dt>Course or framework</dt><dd>{row?.where ?? "None"}</dd></div>
                          <div><dt>Match score</dt><dd>{l.score.toFixed(3)}</dd></div>
                          <div><dt>Proposed relation</dt><dd>{l.match}</dd></div>
                        </dl>
                        <details className="fine">
                          <summary>How it was proposed</summary>
                          <p>{l.method}</p>
                        </details>
                        {l.url && (
                          <button type="button" className="link" onClick={() => void api.openLink(l.url as string).catch((e: Error) => setStatus(e.message))}>
                            Open the source
                          </button>
                        )}
                        <div className="seg alignment-actions">
                          <button type="button" className={made?.decision === "right" ? "on" : ""} aria-pressed={made?.decision === "right"} onClick={() => decide("right", { link: l.id, row: l.row })}>
                            Right
                          </button>
                          <button type="button" className={made?.decision === "partly" ? "on" : ""} aria-pressed={made?.decision === "partly"} onClick={() => { setCursor(i); setPartly(true); }}>
                            Partly
                          </button>
                          <button type="button" className={made?.decision === "wrong" ? "on" : ""} aria-pressed={made?.decision === "wrong"} onClick={() => decide("wrong", { link: l.id, row: l.row })}>
                            Wrong
                          </button>
                        </div>
                        {partly && i === cursor && (
                          <div className="alignment-reasons" role="group" aria-label="Why it is partly right">
                            {REASONS.map((r, n) => (
                              <button key={r} type="button" onClick={() => { decide("partly", { link: l.id, row: l.row }, r); setPartly(false); }}>
                                {REASON_KEYS[n].toUpperCase()}: {r}
                              </button>
                            ))}
                          </div>
                        )}
                        {made && (
                          <p className="muted small">
                            {made.decision === "partly" ? `Partly: ${made.reason}` : made.decision === "right" ? "Right" : "Wrong"}, by {made.reviewer} on {made.at}
                          </p>
                        )}
                        {(opinions.get(`${atom}|${l.id}`) ?? []).map((o, n) => (
                          <p key={`o${n}`} className="muted small alignment-other">
                            Another reviewer said {o.decision === "partly" ? `partly, ${o.reason}` : o.decision}: {o.reviewer} on {o.at}
                          </p>
                        ))}
                        {made?.previous?.map((e, n) => (
                          <p key={n} className="muted small alignment-earlier">
                            Earlier: {e.decision === "partly" ? `partly, ${e.reason}` : e.decision}, by {e.reviewer} on {e.at}
                          </p>
                        ))}
                      </li>
                    );
                  })}
                </ol>
                {state.added.length > 0 && (
                  <>
                    <h4>Links you added</h4>
                    <ul className="alignment-added">
                      {state.added.map((d) => (
                        <li key={decisionKey(d)}>
                          {rows[d.row as string]?.label ?? rows[d.row as string]?.code ?? d.row}{" "}
                          <button type="button" className="link" onClick={() => save({ remove: decisionKey(d) })}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {[...opinions.entries()].filter(([key]) => key === `${atom}|none` || key.startsWith(`${atom}|row:`)).flatMap(([key, list]) =>
                  list.map((o, n) => (
                    <p key={`${key}${n}`} className="muted small alignment-other">
                      Another reviewer {key.endsWith("|none") ? "said no match exists" : `added the row ${key.split("|row:")[1]}`}: {o.reviewer} on {o.at}
                    </p>
                  )),
                )}
                <div className="toolbar">
                  <button type="button" aria-pressed={state.none} className={state.none ? "on" : ""} onClick={() => (state.none ? save({ remove: `${atom}|none` }) : decide("no-match", { link: null, row: null }))}>
                    No match exists
                  </button>
                </div>
                <form className="toolbar" onSubmit={(e) => { e.preventDefault(); void find(); }}>
                  <input ref={search} className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the corpus to add a link" aria-label="Search the corpus to add a link" />
                  <button type="submit">Search</button>
                </form>
                {hits && hits.length === 0 && <p className="muted">No corpus row matches.</p>}
                {hits && hits.length > 0 && (
                  <ul className="alignment-hits">
                    {hits.map((h) => (
                      <li key={h.id}>
                        <span>{h.label ?? <span className="muted">{NO_LABEL}</span>}</span>
                        <span className="muted small">{[h.code, h.level, h.where].filter(Boolean).join(", ")}</span>
                        <button type="button" onClick={() => { setRows((now) => ({ ...now, [h.id]: h })); decide("added", { link: null, row: h.id }); }}>
                          Add this link
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
