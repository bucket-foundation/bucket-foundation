import { useCallback, useEffect, useRef, useState } from "react";
import type { Api, Note } from "../api";
import { Lesson } from "./Lesson";

const SAVE_MS = 700;

export function NotesView({ api }: { api: Api }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [current, setCurrent] = useState<Note | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [preview, setPreview] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.notes();
      setNotes(list);
      return list;
    } catch (e) {
      setStatus((e as Error).message);
      return [];
    }
  }, [api]);

  useEffect(() => {
    void load().then((list) => {
      if (list[0]) {
        setCurrent(list[0]);
        setDraft({ title: list[0].title, body: list[0].body });
      }
    });
  }, [load]);

  const persist = useCallback(
    async (note: Note | null, next: { title: string; body: string }, pinned = note?.pinned ?? false) => {
      try {
        const saved = await api.saveNote({ id: note?.id, title: next.title || "Untitled", body: next.body, pinned });
        setCurrent(saved);
        setStatus(`Saved ${new Date(saved.updatedAt).toLocaleTimeString()}`);
        void load();
      } catch (e) {
        setStatus((e as Error).message);
      }
    },
    [api, load],
  );

  const edit = (next: { title: string; body: string }) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(current, next), SAVE_MS);
  };

  const pick = (n: Note) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      void persist(current, draft);
    }
    setCurrent(n);
    setDraft({ title: n.title, body: n.body });
  };

  const create = async () => {
    const saved = await api.saveNote({ title: "Untitled", body: "", pinned: false });
    await load();
    pick(saved);
  };

  const remove = async () => {
    if (!current || !window.confirm(`Delete "${current.title}"?`)) return;
    await api.deleteNote(current.id);
    const list = await load();
    setCurrent(list[0] ?? null);
    setDraft(list[0] ? { title: list[0].title, body: list[0].body } : { title: "", body: "" });
  };

  const shown = (notes ?? []).filter((n) => !q.trim() || `${n.title}\n${n.body}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <section>
      <header className="head">
        <h1>Notes</h1>
        <p className="muted">Kept on this computer, encrypted with your device key.</p>
      </header>
      <div className="split notes">
        <div className="panel list">
          <div className="toolbar">
            <button className="primary" onClick={() => void create()}>
              New note
            </button>
          </div>
          <input className="search" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
          <ol className="people">
            {shown.map((n) => (
              <li key={n.id}>
                <button className={current?.id === n.id ? "on" : ""} onClick={() => pick(n)}>
                  <span className="rank">{n.pinned ? "•" : ""}</span>
                  <span className="who">
                    {n.title}
                    <span className="muted small">{new Date(n.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span />
                </button>
              </li>
            ))}
          </ol>
          {notes && notes.length === 0 && <p className="muted small">No notes yet.</p>}
        </div>
        {current ? (
          <article className="panel card editor">
            <div className="toolbar">
              <input className="title-input" value={draft.title} onChange={(e) => edit({ ...draft, title: e.target.value })} aria-label="Title" />
              <button className="ghost" onClick={() => void persist(current, draft, !current.pinned)}>
                {current.pinned ? "Unpin" : "Pin"}
              </button>
              <button className="ghost" onClick={() => setPreview((p) => !p)}>
                {preview ? "Edit" : "Preview"}
              </button>
              <button className="ghost" onClick={() => void remove()}>
                Delete
              </button>
            </div>
            {preview ? (
              <Lesson text={draft.body || "Nothing written yet."} />
            ) : (
              <textarea className="body-input" value={draft.body} onChange={(e) => edit({ ...draft, body: e.target.value })} placeholder="Markdown: # headings, - lists, **bold**, `code`, $math$" />
            )}
            {status && <p className="muted small">{status}</p>}
          </article>
        ) : (
          <div className="panel empty">
            <h2>No note open</h2>
            <p className="muted">Start one with New note.</p>
          </div>
        )}
      </div>
    </section>
  );
}
