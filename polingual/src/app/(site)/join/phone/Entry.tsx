"use client";

import type { FormEvent } from "react";
import { displayNickname, normalizeCode } from "@/lib/stoa/client";
import { nicknameChoices } from "@/lib/stoa/nicknames";
import type { Seat } from "@/lib/stoa/seat";
import { Button, Card, Pill } from "@/ui";
import styles from "../../live/stoa.module.css";

export function BackCard({ back, onResume, onFresh }: { back: Seat; onResume: () => void; onFresh: () => void }) {
  return (
    <Card as="section" className={styles.card} data-testid="join-back">
      <p className={styles.label}>Room {back.code}</p>
      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.body}>This phone already has a seat in this room.</p>
      <Button onClick={onResume} data-testid="continue">
        {back.nickname ? `Continue as ${displayNickname(back.nickname)}` : "Continue with my seat"}
      </Button>
      <Button variant="ghost" size="md" onClick={onFresh} data-testid="someone-new">Join as someone new</Button>
    </Card>
  );
}

export function CodeCard({ code, setCode, onSubmit }: { code: string; setCode: (c: string) => void; onSubmit: (e: FormEvent) => void }) {
  return (
    <Card as="form" className={styles.card} onSubmit={onSubmit} data-testid="join-code">
      <p className={styles.label}>Join a live room</p>
      <h1 className={styles.title}>Enter the room code</h1>
      <label className={styles.ticket}>
        <span className={styles.ticketCap}>Room code · admit one</span>
        <input className={styles.codeInput} value={code} onChange={(e) => setCode(normalizeCode(e.target.value))} inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={6} size={6} data-testid="code-input" aria-describedby="code-help" />
      </label>
      <p id="code-help" className={styles.muted}>6 letters and numbers.</p>
      <p className={styles.muted}>No account and no personal details. <a href="/live/student-data" data-testid="student-data-link">How we handle student data</a></p>
      <Button type="submit" disabled={code.length !== 6}>Next</Button>
    </Card>
  );
}

export function NameCard({ code, names, setNames, busy, onJoin, onChangeCode }: { code: string; names: string[]; setNames: (n: string[]) => void; busy: boolean; onJoin: (n: string) => void; onChangeCode: () => void }) {
  return (
    <Card as="section" className={styles.card} data-testid="join-name">
      <p className={styles.label}>Room {code}</p>
      <h1 className={styles.title}>Pick your name</h1>
      <ul className={styles.chips}>
        {names.map((n) => (
          <li key={n}>
            <Pill disabled={busy} onClick={() => onJoin(n)} data-testid="nickname">{displayNickname(n)}</Pill>
          </li>
        ))}
      </ul>
      <div className={styles.row}>
        <Button variant="ghost" size="md" onClick={() => setNames(nicknameChoices(Math.random))}>Other names</Button>
        <Button variant="ghost" size="md" onClick={onChangeCode}>Change code</Button>
      </div>
    </Card>
  );
}
