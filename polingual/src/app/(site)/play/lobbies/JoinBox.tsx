"use client";

import { useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { NICK_MAX } from "@/lib/lobby/client";
import { Button } from "@/ui";
import app from "../../app/app.module.css";
import styles from "../play.module.css";
import { savedNickname } from "../usePlay";
import type { LobbiesState } from "./useLobbies";

export function JoinBox({ s }: { s: LobbiesState }) {
  const [name, setName] = useState(() => savedNickname());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsName = s.state.status !== "ready";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = s.code.trim();
    const code = raw ? normalizeLobbyCode(raw) : null;
    if (raw && !code) return setError("Codes have 6 letters and numbers.");
    setError(null);
    setBusy(true);
    if (needsName) await s.connect(name);
    if (code) s.router.push(`/play/${code}`);
    else setBusy(false);
  };
  return (
    <form id="lobby-name" className={styles.joinBox} onSubmit={(e) => void submit(e)} data-testid="join-box">
      <label className={app.field}>
        Join with a code
        <input value={s.code} onChange={(e) => s.setCode(e.target.value)} maxLength={8} autoCapitalize="characters" autoComplete="off" placeholder="ABC123" data-testid="join-code" />
      </label>
      {needsName ? (
        <label className={app.field}>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={NICK_MAX} minLength={2} required autoComplete="nickname" data-testid="nickname" />
        </label>
      ) : null}
      <Button type="submit" disabled={busy || (needsName ? name.trim().length < 2 : !s.code.trim())} data-testid="join-go">
        {s.code.trim() || !needsName ? "Join" : "Continue"}
      </Button>
      {error ? <p className={app.error} role="alert">{error}</p> : null}
    </form>
  );
}
