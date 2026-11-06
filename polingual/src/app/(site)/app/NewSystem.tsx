"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LANGS, langName, MAX_TARGETS, validateSystem, type LangSystem, type SystemError } from "@academy/lang-systems";
import type { SaveResult } from "@academy/lang-client";
import { appHref, presetsFor, ROOT_CHOICES, targetChoices, toggleTarget } from "@/lib/app/systems";
import styles from "./app.module.css";

const ERROR_TEXT: Record<SystemError, string> = {
  "no-targets": "Pick at least one language to learn.",
  "too-many": `Pick ${MAX_TARGETS} languages at most.`,
  "unknown-language": "That language is not in the course yet.",
  "root-in-targets": "Your root language cannot also be a language you learn.",
  duplicate: "You already have this system.",
};

export default function NewSystem({ first = false, systems = [], create }: { first?: boolean; systems?: LangSystem[]; create: (root: string, targets: string[]) => Promise<{ system: LangSystem; result: SaveResult }> }) {
  const router = useRouter();
  const [root, setRoot] = useState("en");
  const [targets, setTargets] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presets = useMemo(() => presetsFor(root), [root]);
  const choices = useMemo(() => targetChoices(root), [root]);

  async function submit() {
    const err = validateSystem(root, targets, systems);
    if (err) return setError(ERROR_TEXT[err]);
    setBusy(true);
    setError(null);
    try {
      const { system, result } = await create(root, targets);
      if (result === "failed") setError("Saved on this device. It syncs when the connection comes back.");
      router.push(appHref.place(system.id, system.targets[0]));
    } catch {
      setBusy(false);
      setError("The system did not save. Try again.");
    }
  }

  return (
    <section className={styles.stack} data-testid="new-system">
      <div>
        <p className={styles.label}>{first ? "Welcome" : "New system"}</p>
        <h1 className={styles.title}>Build your language system</h1>
        <p className={styles.body}>Pick the language you think in, then up to {MAX_TARGETS} languages to learn side by side.</p>
      </div>
      <label className={styles.field}>
        <span>Root language</span>
        <select value={root} onChange={(e) => { setRoot(e.target.value); setTargets((t) => t.filter((x) => x !== e.target.value)); }} data-testid="root">
          {ROOT_CHOICES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
      <div className={styles.stackSm}>
        <p className={styles.fieldLabel}>Presets</p>
        <div className={styles.chips}>
          {presets.map((p) => (
            <button key={p.targets.join("-")} type="button" className={styles.preset} aria-pressed={p.targets.length === targets.length && p.targets.every((t) => targets.includes(t))} onClick={() => { setTargets(p.targets); setError(null); }} data-testid="preset">
              {p.name} <span className={styles.level}>{p.targets.map(langName).join(", ")}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.stackSm}>
        <p className={styles.fieldLabel}>Favorite languages <span className={styles.level}>{targets.length} of {MAX_TARGETS}</span></p>
        <div className={styles.chips}>
          {choices.map((c) => (
            <button key={c.code} type="button" lang={LANGS[c.code]?.bcp47} className={styles.pick} aria-pressed={targets.includes(c.code)} onClick={() => { setTargets((t) => toggleTarget(t, c.code, root)); setError(null); }} data-testid={`lang-${c.code}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {error ? <p role="alert" className={styles.error} data-testid="system-error">{error}</p> : null}
      <button type="button" className={styles.cta} disabled={busy} onClick={submit} data-testid="create-system">
        {busy ? "Saving" : "Continue to placement"}
      </button>
    </section>
  );
}
