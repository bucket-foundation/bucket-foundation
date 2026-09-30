import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdvisorRow } from "@ros/advisor-review";
import type { Api, StoredReview } from "../api";
import { readJsonFile } from "./file";

const pct = (v: number) => `${Math.round(v * 100)}`;
const text = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v === null || v === undefined ? "" : String(v));

export function AdvisorsView({ api }: { api: Api }) {
  const [review, setReview] = useState<StoredReview | null | undefined>(undefined);
  const [forgotten, setForgotten] = useState(0);
  const [pending, setPending] = useState<unknown>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<number | null>(null);

  const load = useCallback(() => {
    api.advisor().then(
      (r) => {
        setReview(r.review);
        setForgotten(r.forgotten);
        setPicked(r.review?.rows[0]?.rank ?? null);
      },
      (e: Error) => setStatus(e.message),
    );
  }, [api]);

  useEffect(load, [load]);

  const run = async (file: unknown, force: boolean) => {
    try {
      const r = await api.importAdvisor(file, force);
      setPending(r.forgotten > 0 ? file : null);
      setStatus(r.forgotten > 0 ? `Imported ${r.imported} people. ${r.forgotten} you asked Bucket to forget were left out.` : `Imported ${r.imported} people.`);
      load();
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const onFile = async (f: File | undefined) => {
    const parsed = await readJsonFile(f);
    if (!parsed.ok) return setStatus(parsed.error);
    await run(parsed.value, false);
  };

  const forget = async () => {
    if (!window.confirm("Forget every person in this review? Bucket keeps only keyed hashes so a later import can leave them out.")) return;
    const r = await api.forgetAdvisor();
    setStatus(`Forgot ${r.forgotten} people.`);
    load();
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = review?.rows ?? [];
    return needle ? all.filter((r) => [r.name, text(r.fields.institution), text(r.fields.field)].join(" ").toLowerCase().includes(needle)) : all;
  }, [review, q]);
  const person = review?.rows.find((r) => r.rank === picked) ?? null;

  if (review === undefined) return <p className="muted">Loading advisors…</p>;

  return (
    <section>
      <header className="head">
        <h1>Advisors</h1>
        <p className="muted">{review ? `${review.rows.length} people ranked against your statement` : "Open the review.json that advisor-review or fit-me wrote."}</p>
      </header>
      <div className="toolbar">
        <label className="file">
          <input type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
          <span>{review ? "Open another review" : "Open review.json"}</span>
        </label>
        {review && (
          <button className="ghost" onClick={() => void forget()}>
            Forget these people
          </button>
        )}
        {forgotten > 0 && <span className="muted small">{forgotten} forgotten</span>}
      </div>
      {status && (
        <p className="status">
          {status}{" "}
          {pending !== null && (
            <button className="link" onClick={() => window.confirm("Import the forgotten people again?") && void run(pending, true)}>
              Import them again
            </button>
          )}
        </p>
      )}
      {review && (
        <div className="split">
          <div className="panel list">
            <input className="search" placeholder="Filter by name, institution or field" value={q} onChange={(e) => setQ(e.target.value)} />
            <ol className="people">
              {rows.slice(0, 300).map((r) => (
                <li key={r.rank}>
                  <button className={r.rank === picked ? "on" : ""} onClick={() => setPicked(r.rank)}>
                    <span className="rank">{r.rank}</span>
                    <span className="who">
                      {r.name}
                      <span className="muted small">{text(r.fields.institution)}</span>
                    </span>
                    <span className="score">{r.percentile === null ? r.score.toFixed(2) : `${Math.round(r.percentile)}th`}</span>
                  </button>
                </li>
              ))}
            </ol>
            {rows.length > 300 && <p className="muted small">Showing 300 of {rows.length}; filter to narrow.</p>}
          </div>
          {person && <Person row={person} review={review} />}
        </div>
      )}
    </section>
  );
}

function Person({ row, review }: { row: AdvisorRow; review: StoredReview }) {
  const facts = ["institution", "department", "field", "country", "h_index", "works_count", "funding", "taking_students", "research_areas", "shared_terms"]
    .map((k) => [k, text(row.fields[k])] as const)
    .filter(([, v]) => v);
  return (
    <article className="panel card person">
      <span className="tag">rank {row.rank}</span>
      <h2>{row.name}</h2>
      <dl className="facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k.replace(/_/g, " ")}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {row.star_prime.length > 0 && (
        <>
          <h3>Prime directions</h3>
          <p className="muted small">Bar: this person's percentile. Mark: your statement.</p>
          <Bars labels={review.prime_axes} you={review.star_query_prime} them={row.star_prime} />
        </>
      )}
      {row.star_ours.length > 0 && (
        <>
          <h3>Your directions</h3>
          <Bars labels={review.our_axes} you={review.star_query_ours} them={row.star_ours} />
        </>
      )}
      {Object.keys(row.links).length > 0 && (
        <p className="links">
          {Object.entries(row.links).map(([k, u]) => (
            <a key={k} href={u} target="_blank" rel="noreferrer noopener">
              {k.replace(/_url$/, "").replace(/_/g, " ")}
            </a>
          ))}
        </p>
      )}
    </article>
  );
}

function Bars({ labels, you, them }: { labels: string[]; you: number[]; them: number[] }) {
  return (
    <ul className="bars">
      {them.map((v, i) => (
        <li key={i}>
          <span className="label">{labels[i] ?? `direction ${i + 1}`}</span>
          <span className="track">
            <span className="them" style={{ width: `${pct(v)}%` }} />
            {you[i] !== undefined && <span className="you" style={{ left: `${pct(you[i])}%` }} title="your statement" />}
          </span>
          <span className="value">{pct(v)}</span>
        </li>
      ))}
    </ul>
  );
}
