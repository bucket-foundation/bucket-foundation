"use client";

import Link from "next/link";
import { useState } from "react";
import { isPreviewLanguage, languagesByName, toggleLanguage } from "@/lib/research-os/work-quiz/languages";

export const LANGUAGES_SAVE_FAILED = "Your languages were not saved.";

export const CHIP = "small-caps text-[11px] tracking-[0.05em] px-3.5 py-2 min-h-[44px] rounded-full border transition-colors";
export const CHIP_ON = `${CHIP} bg-[color:var(--aegean-deep)] text-[color:var(--bone)] border-transparent`;
export const CHIP_OFF = `${CHIP} bg-[color:var(--bone)]/70 text-[color:var(--basalt-2)] border-[color:var(--hairline)] hover:bg-[color:var(--bone-2)]`;

export interface LanguagePickerProps {
  languages: readonly string[];
  fromSystems?: readonly string[];
  save(next: string[]): Promise<string[]>;
  onSaved?(next: string[]): void;
}

export default function LanguagePicker({ languages, fromSystems = [], save, onSaved }: LanguagePickerProps) {
  const [chosen, setChosen] = useState<readonly string[]>(languages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (code: string) => {
    const next = toggleLanguage(chosen, code);
    setChosen(next);
    setBusy(true);
    try {
      const saved = await save(next);
      setChosen(saved);
      setError(null);
      onSaved?.(saved);
    } catch {
      setChosen(chosen);
      setError(LANGUAGES_SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border border-[color:var(--hairline)] rounded-sm p-4 bg-[color:var(--bone)]/70">
      <h2 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">languages</h2>
      <p className="mt-1 text-[13px] text-[color:var(--basalt-2)]">Pick the languages you know or are learning. Word questions in them join the quiz. Changes save as you tap.</p>
      {fromSystems.length > 0 && (
        <p data-testid="from-systems" className="mt-1 text-[13px] text-[color:var(--basalt-2)]">
          Languages in your <Link href="/research-os/learn/languages" className="underline">language systems</Link> are always on here. Change them there.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="languages">
        {languagesByName().map((l) => {
          const locked = fromSystems.includes(l.code);
          const on = locked || chosen.includes(l.code);
          return (
            <button key={l.code} type="button" aria-pressed={on} disabled={busy || locked} title={locked ? "From your language systems" : undefined} onClick={() => void toggle(l.code)} className={on ? CHIP_ON : CHIP_OFF}>
              {l.name}
              {isPreviewLanguage(l.code) && <span data-testid="preview-badge" className="ml-1 small-caps text-[10px] tracking-[0.12em]">Preview</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">Words and definitions from Wiktionary via Kaikki, CC-BY-SA.</p>
      {error && <p role="alert" className="mt-2 text-[12px] text-[color:var(--basalt)]">{error}</p>}
    </section>
  );
}
