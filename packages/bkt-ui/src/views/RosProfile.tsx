import { useEffect, useState, type FormEvent } from "react";
import { BIRTH_YEAR_BUCKET_LABELS, ROLE_LABELS } from "@ros/profile";
import { deleteConfirmed } from "@ros/privacy-actions";
import { DELETE_CONFIRM_TOKEN, type BirthYearBucket, type LearnerRole } from "@ros/types";
import "../ros.css";

interface ProfileData {
  profile: { role: LearnerRole; birthYearBucket: BirthYearBucket | null } | null;
  game: { level: number; xp: number; into?: number; span?: number; streakDays: number; badges: { kind?: string }[] } | null;
}

const ROLES: LearnerRole[] = ["independent", "student", "teacher"];
const BANDS: BirthYearBucket[] = ["18plus", "13to17", "under13"];
export const UNDER_13_NOTE = "Choosing under 13 clears your progress on this computer.";
export const DELETE_WORD = DELETE_CONFIRM_TOKEN;
export const DELETE_NOTE = "This removes your profile, level and idea progress on this computer, and it cannot be undone. Your Learn decks, notes and history stay.";
export const EXPORT_TROUBLE = "Bucket could not save the export. Try again.";
export const DELETE_TROUBLE = "Bucket could not delete your data. Try again.";
const PRIVACY = "/api/research-os/privacy";

function badgeCounts(badges: { kind?: string }[]): { internalized: number; produced: number } {
  return { internalized: badges.filter((b) => b.kind === "internalized").length, produced: badges.filter((b) => b.kind === "produced").length };
}

function YourData({ onDeleted }: { onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const post = (body: Record<string, unknown>) => fetch(PRIVACY, { method: "POST", body: JSON.stringify(body) }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

  const exportMine = async () => {
    setBusy(true);
    setNote(null);
    try {
      const out = (await post({ action: "export", save: true })) as { saved?: { name: string; folder: string } };
      setNote(out.saved ? `Saved your profile and idea progress in ${out.saved.folder} as ${out.saved.name.replace(/\.[a-z]+$/i, "")}.` : EXPORT_TROUBLE);
    } catch {
      setNote(EXPORT_TROUBLE);
    } finally {
      setBusy(false);
    }
  };

  const deleteMine = async () => {
    if (!deleteConfirmed(typed)) return;
    setBusy(true);
    setNote(null);
    try {
      await post({ action: "delete", confirm: DELETE_WORD });
      setConfirming(false);
      setTyped("");
      setNote("Your data on this computer is deleted.");
      onDeleted();
    } catch {
      setNote(DELETE_TROUBLE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="panel card" aria-label="your data">
      <h2>Your data</h2>
      <div className="toolbar">
        <button type="button" disabled={busy} onClick={() => void exportMine()}>
          Export my profile and idea progress
        </button>
        {!confirming && (
          <button type="button" className="danger" disabled={busy} onClick={() => setConfirming(true)}>
            Delete my profile and idea progress
          </button>
        )}
      </div>
      {confirming && (
        <div className="confirm">
          <p className="small">
            {DELETE_NOTE} Type <strong>{DELETE_WORD}</strong> to confirm.
          </p>
          <div className="toolbar">
            <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="type the confirm word" placeholder={DELETE_WORD} />
            <button type="button" className="danger" disabled={busy || !deleteConfirmed(typed)} onClick={() => void deleteMine()}>
              Delete
            </button>
            <button type="button" onClick={() => (setConfirming(false), setTyped(""))}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {note && <p className="muted small" role="status">{note}</p>}
    </article>
  );
}

export function RosProfileView() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [role, setRole] = useState<LearnerRole>("independent");
  const [band, setBand] = useState<BirthYearBucket>("18plus");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/research-os/profile", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ProfileData>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        setData(d);
        if (d.profile) {
          setRole(d.profile.role);
          if (d.profile.birthYearBucket) setBand(d.profile.birthYearBucket);
        }
      })
      .catch(() => setError("Your profile did not load. Close the window and open it again."));

  useEffect(() => {
    void load();
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (band === "under13" && !window.confirm(UNDER_13_NOTE)) return;
    setSaved(false);
    setError(null);
    try {
      const r = await fetch("/api/research-os/profile", { method: "POST", body: JSON.stringify({ role, birthYearBucket: band }) });
      if (!r.ok) throw new Error(String(r.status));
      setSaved(true);
      await load();
    } catch {
      setError("That did not save. Try again.");
    }
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading your profile…</p>;
  const g = data.game;

  return (
    <section>
      <header className="head">
        <h1>Profile</h1>
        <p className="muted">Kept on this computer only.</p>
      </header>
      <article className="panel card">
        <h2>Level</h2>
        {g ? (
          <>
            <p>
              Level {g.level} · {g.xp} XP · {g.streakDays} day streak
            </p>
            {g.into !== undefined && g.span ? <p className="muted small">{g.span - g.into} XP to the next level.</p> : null}
            <p className="muted small">
              Badges: {badgeCounts(g.badges).internalized} ideas made your own · {badgeCounts(g.badges).produced} pieces of work
            </p>
          </>
        ) : (
          <p className="muted">Open an idea on the knowledge graph to start earning XP.</p>
        )}
      </article>
      <form className="panel card ros-form" onSubmit={save}>
        <h2>About you</h2>
        <label>
          I am a
          <select value={role} onChange={(e) => setRole(e.target.value as LearnerRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Age
          <select value={band} onChange={(e) => setBand(e.target.value as BirthYearBucket)}>
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {BIRTH_YEAR_BUCKET_LABELS[b]}
              </option>
            ))}
          </select>
        </label>
        {band === "under13" && <p className="muted small">{UNDER_13_NOTE}</p>}
        <button className="primary" type="submit">
          Save
        </button>
        {saved && <p className="muted small">Saved.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      <YourData onDeleted={() => void load()} />
    </section>
  );
}
