"use client";

import { useEffect, useState, type FormEvent } from "react";
import { handleError, loadProfile, saveProfile, type Profile } from "@/lib/app/profile";
import { Avatar, lookFromSeed } from "@/ui/avatar";
import { useSession } from "../AppShell";
import styles from "../app.module.css";
import { Button, Field, Input, Sheet, Stage } from "@/ui";

export default function Account() {
  const { signOut } = useSession();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [form, setForm] = useState<Profile>({ handle: "", displayName: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void loadProfile().then((r) => {
      if (r.status === "error") return setState("error");
      if (r.profile) setForm(r.profile);
      setState("ready");
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const bad = handleError(form.handle.trim());
    if (bad) return setNote({ ok: false, text: bad });
    setBusy(true);
    const r = await saveProfile({ handle: form.handle.trim(), displayName: form.displayName.trim() });
    setBusy(false);
    if (r.ok) setForm(r.profile);
    setNote(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error });
  }

  return (
    <Stage ground="paper">
      <Sheet className={styles.account} data-testid="account">
        <div className={styles.accountHead}>
          <Avatar look={lookFromSeed(form.handle || "polingual")} size={88} />
          <div>
            <p className={styles.label}>Your account</p>
            <h1 className={styles.title}>{form.displayName || "Polingual learner"}</h1>
            {form.handle ? <p className={styles.small}>@{form.handle}</p> : null}
          </div>
        </div>
        {state === "loading" ? <p className={styles.muted} aria-busy="true">Loading your profile</p> : null}
        {state === "error" ? <p className={styles.error} role="alert">Your profile did not load. Reload the page to try again.</p> : null}
        {state === "ready" ? (
          <form className={styles.form} onSubmit={save}>
            <Field label="Display name">
              <Input value={form.displayName} maxLength={60} autoComplete="nickname" onChange={(e) => setForm({ ...form, displayName: e.target.value })} data-testid="display-name" />
            </Field>
            <Field label="Username" hint="Lowercase letters, numbers, dashes and underscores.">
              <Input value={form.handle} maxLength={32} autoCapitalize="none" spellCheck={false} onChange={(e) => setForm({ ...form, handle: e.target.value.toLowerCase() })} data-testid="handle" />
            </Field>
            <Button type="submit" disabled={busy} data-testid="save-profile">{busy ? "Saving" : "Save"}</Button>
            {note ? <p role="status" className={note.ok ? styles.small : styles.error} data-testid="profile-note">{note.text}</p> : null}
          </form>
        ) : null}
        <Button variant="secondary" size="md" onClick={signOut} data-testid="account-sign-out">Sign out</Button>
      </Sheet>
    </Stage>
  );
}
