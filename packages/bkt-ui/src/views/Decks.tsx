import { useEffect, useState } from "react";
import { ApiError, type Api, type DecksBody, type InstalledDeckRow, type LinkMode, type LinkSearch, type LinkStatus, type WordHit, type WordSearch } from "../api";
import { Ipa, WordAttribution, WordForm } from "./Words";

export const WORD_SEARCH_LABEL = "Search words";
export const WORD_SEARCH_HINT = "A word or a meaning";
export const NO_WORD_HITS = "No word matches.";
export const WORD_SEARCH_FAILED = "Word search did not run.";
export const MEANING_LABEL = "Close in meaning";
export const SOUND_LABEL = "Sounds like";
export const LINK_WAIT = "Looking through the word database. A phrase can take half a minute.";
export const LINK_NO_WORD = "That word is not in the word database. Try one word, as it is spelled.";
export const LINK_TROUBLE = "The word database did not answer.";
export const LINK_FIELD = "Word database address";
export const LINK_HINT = "postgres://user:password@127.0.0.1:5433/polingual";
export const LINK_NOTE = "Optional. Link a Polingual word database that runs on this computer and the Languages section gains search by meaning and by sound. Bucket only reads from it.";
export const LINK_REFUSED = "Bucket links only to a database on this computer, at 127.0.0.1 or localhost.";
export const LINK_FAILED = "The link setting did not load.";
export const NO_DECKS = "No extra deck is installed. Bucket teaches from the words it ships with.";
export const DECKS_FAILED = "The installed decks did not load.";
export const DECKS_NOTE = "Installed decks add words to the Languages section of Learn.";

export function sizeText(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function deckCount(d: Pick<InstalledDeckRow, "cards" | "kind">): string {
  return `${d.cards.toLocaleString("en-US")} ${d.kind === "words" ? "words" : "cards"}`;
}

function Hit({ h }: { h: WordHit }) {
  return (
    <li className="word-hit">
      <span className="muted small">{h.name}</span>
      <WordForm w={h} big />
      <Ipa ipa={h.ipa} />
      <span className="tag ghost">{h.pos}</span>
      <span className="word-hit-meaning" dir="ltr">
        {h.meaning}
      </span>
      <a className="small" href={h.href} target="_blank" rel="noreferrer noopener">
        Full entry
      </a>
    </li>
  );
}

export function linkLine(s: Pick<LinkStatus, "linked" | "reachable" | "place">): string {
  if (!s.linked) return "No word database is linked.";
  if (!s.reachable) return `Linked to ${s.place}, and it did not answer just now.`;
  return `Linked to ${s.place}. It answers.`;
}

export function closenessText(c: number): string {
  return `${Math.round(c * 100)} percent close`;
}

function Near({ found }: { found: LinkSearch }) {
  const what = found.mode === "meaning" ? "close in meaning to" : "that sound like";
  return (
    <div className="panel word-hits" aria-live="polite">
      <p className="muted small">
        {found.from ? `Words ${what} ${found.from.word} (${found.from.name}${found.from.meaning ? `: ${found.from.meaning}` : ""}).` : `Words ${what} what you typed.`}
      </p>
      <ul>
        {found.hits.map((h) => (
          <li key={`${h.lang}:${h.word}`} className="word-hit">
            <span className="muted small">{h.name}</span>
            <WordForm w={h} big />
            <Ipa ipa={h.ipa} />
            {h.pos && <span className="tag ghost">{h.pos}</span>}
            <span className="word-hit-meaning" dir="ltr">
              {h.meaning}
            </span>
            <span className="muted small">{closenessText(h.closeness)}</span>
            <a className="small" href={h.href} target="_blank" rel="noreferrer noopener">
              Full entry
            </a>
          </li>
        ))}
      </ul>
      <WordAttribution credit={found.credit} />
    </div>
  );
}

type SearchApi = Pick<Api, "wordSearch"> & Partial<Pick<Api, "polingualLink" | "linkSearch">>;

export function WordSearchBox({ api }: { api: SearchApi }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<WordSearch | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [linked, setLinked] = useState(false);
  const [near, setNear] = useState<LinkSearch | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.polingualLink?.().then(
      (s) => live && setLinked(s.linked && s.reachable),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [api]);

  const runNear = async (mode: LinkMode) => {
    const text = q.trim();
    if (!text || busy || !api.linkSearch) return;
    setBusy(true);
    setFailed(false);
    setFound(null);
    setNear(null);
    setSaid(LINK_WAIT);
    try {
      setNear(await api.linkSearch(text, mode));
      setSaid(null);
    } catch (e) {
      setSaid(e instanceof ApiError && e.status === 404 ? LINK_NO_WORD : LINK_TROUBLE);
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(false);
    setNear(null);
    setSaid(null);
    try {
      setFound(await api.wordSearch(text));
    } catch {
      setFound(null);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="word-search">
      <form
        className="toolbar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <input type="search" aria-label={WORD_SEARCH_LABEL} placeholder={WORD_SEARCH_HINT} value={q} maxLength={80} onChange={(e) => setQ(e.target.value)} />
        <button className="primary" disabled={busy || !q.trim()}>
          {WORD_SEARCH_LABEL}
        </button>
        {linked && (
          <>
            <button type="button" disabled={busy || !q.trim()} onClick={() => void runNear("meaning")}>
              {MEANING_LABEL}
            </button>
            <button type="button" disabled={busy || !q.trim()} onClick={() => void runNear("sound")}>
              {SOUND_LABEL}
            </button>
          </>
        )}
      </form>
      {said && (
        <p className="status" aria-live="polite">
          {said}
        </p>
      )}
      {near && <Near found={near} />}
      {failed && <p className="error">{WORD_SEARCH_FAILED}</p>}
      {found && (
        <div className="panel word-hits" aria-live="polite">
          <p className="muted small">
            {found.hits.length === 0 ? `${NO_WORD_HITS} Bucket looked` : `${found.hits.length} ${found.hits.length === 1 ? "match" : "matches"}`}
            {` in ${found.words.toLocaleString("en-US")} words across ${found.languages} languages.`}
          </p>
          <ul>
            {found.hits.map((h) => (
              <Hit key={`${h.lang}:${h.word}`} h={h} />
            ))}
          </ul>
          <WordAttribution credit={found.credit} />
        </div>
      )}
    </div>
  );
}

export function InstalledDecks({ api }: { api: Pick<Api, "installedDecks"> }) {
  const [body, setBody] = useState<DecksBody | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api.installedDecks().then(
      (b) => live && setBody(b),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api]);

  return (
    <article className="panel card installed-decks">
      <h2>Installed decks</h2>
      {failed && <p className="error">{DECKS_FAILED}</p>}
      {body && body.decks.length === 0 && <p className="muted">{NO_DECKS}</p>}
      {body && body.decks.length > 0 && (
        <>
          <ul className="deck-rows">
            {body.decks.map((d) => (
              <li key={d.id}>
                <b>{d.title}</b>
                <span>{`${deckCount(d)} · ${sizeText(d.bytes)}`}</span>
                <span className="muted small">
                  {`${d.source}, `}
                  {d.licenceHref ? (
                    <a href={d.licenceHref} target="_blank" rel="noreferrer noopener">
                      {d.licence}
                    </a>
                  ) : (
                    d.licence
                  )}
                  {` · curated by ${d.curator}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted small">{DECKS_NOTE}</p>
          <WordAttribution credit={body.credit} />
        </>
      )}
    </article>
  );
}

export function WordDatabaseLink({ api }: { api: Pick<Api, "polingualLink" | "setPolingualLink"> }) {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.polingualLink().then(
      (s) => live && setStatus(s),
      () => live && setMsg(LINK_FAILED),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const save = async (next: string) => {
    setBusy(true);
    setMsg(null);
    try {
      setStatus(await api.setPolingualLink(next));
      setUrl("");
      setMsg(next ? "Saved." : "Link removed.");
    } catch {
      setMsg(LINK_REFUSED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="panel card word-link">
      <h2>Word database</h2>
      <p className="muted">{LINK_NOTE}</p>
      {status && <p>{linkLine(status)}</p>}
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim() && !busy) void save(url.trim());
        }}
      >
        <input type="password" autoComplete="off" spellCheck={false} aria-label={LINK_FIELD} placeholder={LINK_HINT} value={url} disabled={busy} onChange={(e) => setUrl(e.target.value)} />
        <button className="primary" disabled={busy || !url.trim()}>
          Save
        </button>
        {status?.linked && (
          <button type="button" disabled={busy} onClick={() => void save("")}>
            Remove link
          </button>
        )}
      </form>
      {msg && (
        <p className="status" aria-live="polite">
          {msg}
        </p>
      )}
    </article>
  );
}
