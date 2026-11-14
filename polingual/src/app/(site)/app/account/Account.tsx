"use client";

import { useEffect, useState, type FormEvent } from "react";
import { appAuth } from "@/lib/app/auth";
import { cleanHandle, loadProfile, saveProfile, type Profile, type ProfileDeps } from "@/lib/app/profile";
import { Avatar, lookFromSeed } from "@/ui/avatar";
import { useSession } from "../AppShell";
import styles from "../app.module.css";
import { Button, ButtonLink, Field, Input, Sheet, SilentSwitch, Stage } from "@/ui";

const deps = (): ProfileDeps => ({ fetch: window.fetch.bind(window), token: () => appAuth().mobile.accessToken() });

type Note = { ok: boolean; text: string; signIn?: boolean } | null;

function useProfile() {
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [form, setForm] = useState<Profile>({ handle: "", displayName: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    void loadProfile(deps()).then((r) => {
      if (r.status !== "ready") return setState(r.status);
      if (r.profile) setForm(r.profile);
      setState("ready");
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const h = cleanHandle(form.handle);
    if ("error" in h) return setNote({ ok: false, text: h.error });
    setBusy(true);
    const r = await saveProfile({ handle: h.handle, displayName: form.displayName.trim() }, deps());
    setBusy(false);
    if (r.ok) setForm(r.profile);
    setNote(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error, signIn: r.signIn });
  }

  return { state, form, setForm, busy, note, save };
}

function ProfileForm({ p, signOut }: { p: ReturnType<typeof useProfile>; signOut: () => void }) {
  const { form, setForm, busy, note, save } = p;
  return (
    <form className={styles.form} onSubmit={save}>
      <Field label="Display name">
        <Input
          value={form.displayName}
          maxLength={60}
          autoComplete="nickname"
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          data-testid="display-name"
        />
      </Field>
      <Field label="Username" hint="Lowercase letters, numbers, dashes and underscores.">
        <Input
          value={form.handle}
          maxLength={32}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => setForm({ ...form, handle: e.target.value.toLowerCase() })}
          data-testid="handle"
        />
      </Field>
      <Button type="submit" disabled={busy} data-testid="save-profile">
        {busy ? "Saving" : "Save"}
      </Button>
      {note ? (
        <p role="status" className={note.ok ? styles.small : styles.error} data-testid="profile-note">
          {note.text}
          {note.signIn ? (
            <>
              {" "}
              <ButtonLink variant="quiet" size="sm" href="/app" onClick={signOut}>
                Sign in
              </ButtonLink>
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}

function ProfileStatus({ state, signOut }: { state: ReturnType<typeof useProfile>["state"]; signOut: () => void }) {
  if (state === "loading")
    return (
      <p className={styles.muted} aria-busy="true">
        Loading your profile
      </p>
    );
  if (state === "error")
    return (
      <p className={styles.error} role="alert" data-testid="profile-error">
        Your profile did not load. Reload the page to try again.
      </p>
    );
  if (state === "signed-out")
    return (
      <p className={styles.error} role="alert">
        Your session ended.{" "}
        <a href="/app" onClick={signOut}>
          Sign in again
        </a>{" "}
        to see your profile.
      </p>
    );
  return null;
}

export default function Account() {
  const { signOut } = useSession();
  const p = useProfile();
  const { state, form } = p;
  return (
    <Stage ground="paper">
      <Sheet className={styles.account} data-testid="account">
        {state === "ready" ? (
          <div className={styles.accountHead}>
            <Avatar look={lookFromSeed(form.handle || "polingual")} size={88} />
            <div>
              <p className={styles.label}>Your account</p>
              <h1 className={styles.title}>{form.displayName || "Polingual learner"}</h1>
              {form.handle ? <p className={styles.small}>@{form.handle}</p> : null}
            </div>
          </div>
        ) : null}
        <ProfileStatus state={state} signOut={signOut} />
        {state === "ready" ? <ProfileForm p={p} signOut={signOut} /> : null}
        <div className={styles.silentRow}>
          <div>
            <p className={styles.label}>Silent mode</p>
            <p className={styles.small}>For places where you cannot hear. Listening cards wait for later and nothing plays on its own. Tapping a speaker still plays the word. Saved on this device.</p>
          </div>
          <SilentSwitch />
        </div>
        <Button variant="secondary" size="md" onClick={signOut} data-testid="account-sign-out">
          Sign out
        </Button>
      </Sheet>
    </Stage>
  );
}
