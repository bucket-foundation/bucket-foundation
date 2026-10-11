import { useEffect, useState } from "react";
import type { Api, DecksBody, InstalledDeckRow, WordHit, WordSearch } from "../api";
import { Ipa, WordAttribution, WordForm } from "./Words";

export const WORD_SEARCH_LABEL = "Search words";
export const WORD_SEARCH_HINT = "A word or a meaning";
export const NO_WORD_HITS = "No word matches.";
export const WORD_SEARCH_FAILED = "Word search did not run.";
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

export function WordSearchBox({ api }: { api: Pick<Api, "wordSearch"> }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<WordSearch | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(false);
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
      </form>
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
