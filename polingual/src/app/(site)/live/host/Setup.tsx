"use client";

import { useState } from "react";
import { langName, TEAMS } from "@/lib/stoa/client";
import { HOMES, TARGETS, toggledTarget, type HostMode, type HostSettings } from "@/lib/stoa/host";
import { Button, Card, Pill } from "@/ui";
import styles from "../stoa.module.css";

export function useHostSettings() {
  const [home, setHome] = useState("en");
  const [targets, setTargets] = useState<string[]>(["es"]);
  const [school, setSchool] = useState(false);
  const [mode, setMode] = useState<HostMode>("open_floor");
  const [teamCount, setTeamCount] = useState(2);
  const settings: HostSettings = { home, targets, school, mode, teamCount };
  return { settings, setHome, setTargets, setSchool, setMode, setTeamCount };
}

type Props = { s: ReturnType<typeof useHostSettings>; terms: boolean; onTerms: (on: boolean) => void; busy: boolean; onCreate: () => void };

export function HostSetup({ s, terms, onTerms, busy, onCreate }: Props) {
  const { home, targets, school } = s.settings;
  return (
    <Card as="section" className={styles.card} data-testid="host-setup">
      <p className={styles.label}>Host a live room</p>
      <h1 className={styles.title}>Open a room for your class</h1>
      <p className={styles.body}>Players join on their phones with a code. Three rounds of five questions, 20 seconds each.</p>
      <label className={styles.field}>
        <span>Prompts in</span>
        <select value={home} onChange={(e) => { s.setHome(e.target.value); s.setTargets((cur) => cur.filter((t) => t !== e.target.value)); }} data-testid="home">
          {HOMES.map((h) => <option key={h} value={h}>{langName(h)}</option>)}
        </select>
      </label>
      <p className={styles.fieldLabel}>Languages to quiz</p>
      <ul className={styles.chips}>
        {TARGETS.filter((t) => t !== home).map((t) => (
          <li key={t}>
            <Pill aria-pressed={targets.includes(t)} onClick={() => s.setTargets((cur) => toggledTarget(cur, t))} data-testid={`target-${t}`}>{langName(t)}</Pill>
          </li>
        ))}
      </ul>
      <ModePicker s={s} />
      <label className={styles.toggle}>
        <input type="checkbox" checked={school} onChange={(e) => s.setSchool(e.target.checked)} data-testid="school-mode" />
        <span>School mode: no app links or promotions on any screen</span>
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={terms} onChange={(e) => onTerms(e.target.checked)} data-testid="host-terms" />
        <span>
          I accept the <a href="/live/terms">host terms</a>. Players&rsquo; data is covered on the <a href="/live/student-data">student data page</a>.
        </span>
      </label>
      <Button disabled={busy || targets.length === 0 || !terms} onClick={onCreate} data-testid="create-room">
        {busy ? "Opening" : "Open the room"}
      </Button>
    </Card>
  );
}

function ModePicker({ s }: { s: Props["s"] }) {
  const { mode, teamCount } = s.settings;
  return (
    <>
      <p className={styles.fieldLabel}>Mode</p>
      <ul className={styles.chips}>
        <li>
          <Pill aria-pressed={mode === "open_floor"} onClick={() => s.setMode("open_floor")} data-testid="mode-open">Open Floor: every player for themselves</Pill>
        </li>
        <li>
          <Pill aria-pressed={mode === "chorus"} onClick={() => s.setMode("chorus")} data-testid="mode-chorus">Chorus: teams</Pill>
        </li>
      </ul>
      {mode === "chorus" ? (
        <label className={styles.field}>
          <span>Teams</span>
          <select value={teamCount} onChange={(e) => s.setTeamCount(Number(e.target.value))} data-testid="team-count">
            {[2, 3, 4].map((n) => <option key={n} value={n}>{n} teams: {TEAMS.slice(0, n).map((t) => t.name).join(", ")}</option>)}
          </select>
        </label>
      ) : null}
    </>
  );
}
