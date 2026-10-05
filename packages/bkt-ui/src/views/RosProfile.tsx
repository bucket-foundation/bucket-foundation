import { useEffect, useState, type FormEvent } from "react";
import { BIRTH_YEAR_BUCKET_LABELS, ROLE_LABELS } from "@ros/profile";
import type { BirthYearBucket, LearnerRole } from "@ros/consent";
import "../ros.css";

interface ProfileData {
  profile: { role: LearnerRole; birthYearBucket: BirthYearBucket | null } | null;
  game: { level: number; xp: number; streakDays: number; badges: unknown[] } | null;
}

const ROLES: LearnerRole[] = ["independent", "student", "teacher"];
const BANDS: BirthYearBucket[] = ["18plus", "13to17", "under13"];
export const UNDER_13_NOTE = "Choosing under 13 clears your progress on this computer.";

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
          <p>
            Level {g.level} · {g.xp} XP · {g.streakDays} day streak · {g.badges.length} badges
          </p>
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
    </section>
  );
}
