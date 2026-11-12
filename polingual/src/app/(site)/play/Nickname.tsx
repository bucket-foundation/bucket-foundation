"use client";

import { useState } from "react";
import { NICK_MAX } from "@/lib/lobby/client";
import app from "../app/app.module.css";
import styles from "./play.module.css";

export default function Nickname({ initial, onSubmit, busy }: { initial?: string; onSubmit: (name: string) => void; busy?: boolean }) {
  const [name, setName] = useState(initial ?? "");
  return (
    <form
      className={styles.nick}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name);
      }}
      data-testid="nickname-form"
    >
      <label className={app.field}>
        Nickname
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={NICK_MAX} minLength={2} required autoComplete="nickname" data-testid="nickname" />
      </label>
      <button type="submit" className={app.cta} disabled={busy || name.trim().length < 2} data-testid="nickname-go">
        Play
      </button>
    </form>
  );
}
