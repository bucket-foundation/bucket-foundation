"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { normalizeState, type EngineState } from "@/lib/academy/engine";
import { useAccountGate } from "@/lib/academy/account-gate-context";
import { loadLangCorpus, loadSystems, saveSystems, type SaveResult, type SystemsChange } from "@/lib/academy/lang-client";
import SaveNotice from "./SaveNotice";
import {
  createSystem,
  LANG_CODES,
  langName,
  MAX_TARGETS,
  PRESETS,
  progressBranch,
  systemSummary,
  validateSystem,
  type LangCorpus,
  type LangSystem,
  type SystemError,
} from "@/lib/academy/lang-systems";
import { webProgressStore } from "@/lib/academy/progress-store";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";

const ERROR_TEXT: Record<SystemError, string> = {
  "no-targets": "Pick at least one language to learn.",
  "too-many": `Pick ${MAX_TARGETS} languages at most.`,
  "unknown-language": "That language is not in the course.",
  "root-in-targets": "The root language cannot also be a target.",
  duplicate: "You already have this system.",
};

export default function LanguagesHome() {
  const [systems, setSystems] = useState<LangSystem[] | null>(null);
  const [states, setStates] = useState<Record<string, EngineState>>({});
  const [corpus, setCorpus] = useState<LangCorpus | null>(null);
  const [error, setError] = useState(false);
  const [root, setRoot] = useState("en");
  const [targets, setTargets] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveResult | "idle" | "saving">("idle");
  const { guest, requireAccount } = useAccountGate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const server = await webProgressStore.pull();
        const [c, list] = await Promise.all([loadLangCorpus(), loadSystems(server)]);
        const st: Record<string, EngineState> = {};
        for (const s of list) st[s.id] = await webProgressStore.load(progressBranch(s), server);
        if (!alive) return;
        if (!c) setError(true);
        setCorpus(c);
        setStates(st);
        setSystems(list);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const err = systems ? validateSystem(root, targets, systems) : null;

  function toggle(code: string) {
    setTargets((t) => (t.includes(code) ? t.filter((x) => x !== code) : [...t, code]));
  }

  function create() {
    if (!systems || err) return;
    const make = () => {
      const s = createSystem(root, targets, systems);
      setSystems([...systems, s]);
      setTargets([]);
      void persist({ upsert: s });
    };
    if (guest && systems.length === 0) make();
    else requireAccount(make);
  }

  function remove(id: string) {
    if (!systems) return;
    setSystems(systems.filter((s) => s.id !== id));
    void persist({ remove: id });
  }

  async function persist(change: SystemsChange) {
    setSaveState("saving");
    const r = await saveSystems(change);
    setSystems(r.systems);
    setSaveState(r.result);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research OS · learn · languages"
        title="language systems"
        lede="Learn a set of languages together from one root language. Each word comes back in every language of the set, mixed in one queue, with shared roots shown side by side."
        actions={
          <Link href="/research-os/learn" className={BTN_SECONDARY}>
            all decks
          </Link>
        }
      />

      {error ? (
        <ErrorState title="The language course did not load" body="The language corpus files are missing from this deployment." />
      ) : systems === null || corpus === null ? (
        <LoadingState label="Loading your language systems" />
      ) : (
        <>
          {systems.length === 0 ? (
            <EmptyState title="No language systems yet" body="Build one below. English is the default root." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4" data-testid="lang-systems">
              {systems.map((s) => {
                const sum = systemSummary(s, corpus, states[s.id] ?? normalizeState(null));
                return (
                  <Panel key={s.id} title={s.name} meta={`${sum.started} of ${sum.total} cards`}>
                    <p className="text-[13px] text-[color:var(--basalt-2)]">
                      {s.targets.map(langName).join(" · ")} from {langName(s.root)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">
                      <span>{sum.due} due</span>
                      <span>{sum.xp} xp</span>
                      <span>{sum.streak} day streak</span>
                      <span>{sum.sharedRootItems} shared-root words</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {sum.started === 0 && Object.keys(s.placement).length === 0 ? (
                        <Link href={`/research-os/learn/languages/${s.id}/place`} className={BTN_PRIMARY}>
                          placement
                        </Link>
                      ) : (
                        <Link href={`/research-os/learn/languages/${s.id}/study`} className={BTN_PRIMARY}>
                          {sum.due > 0 ? "review" : "continue"}
                        </Link>
                      )}
                      {sum.started === 0 && (
                        <Link href={`/research-os/learn/languages/${s.id}/study`} className={BTN_SECONDARY}>
                          start from zero
                        </Link>
                      )}
                      <Link href={`/research-os/learn/languages/${s.id}`} className={BTN_SECONDARY}>
                        progress
                      </Link>
                      <button type="button" onClick={() => remove(s.id)} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] px-2">
                        remove
                      </button>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}

          <Panel title="new system">
            <label className="flex items-center gap-3 text-[13px] text-[color:var(--basalt-2)]">
              root language
              <select value={root} onChange={(e) => {
                  const v = e.target.value;
                  setRoot(v);
                  setTargets((t) => t.filter((x) => x !== v));
                }} className="border border-[color:var(--hairline)] bg-white/60 px-2 py-1 rounded-sm" aria-label="root language">
                {LANG_CODES.map((c) => (
                  <option key={c} value={c}>
                    {langName(c)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">presets</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.name} type="button" onClick={() => setTargets(p.targets.filter((t) => t !== root))} className={BTN_SECONDARY}>
                  {p.name}: {p.targets.map(langName).join(", ")}
                </button>
              ))}
            </div>
            <div className="mt-4 small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">languages to learn</div>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="languages to learn">
              {LANG_CODES.filter((c) => c !== root).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={targets.includes(c)}
                  onClick={() => toggle(c)}
                  className={
                    "px-3 py-2 text-[13px] rounded-sm border min-h-[40px] " +
                    (targets.includes(c) ? "bg-[color:var(--gold)] border-[color:var(--gold-deep)] text-[color:var(--basalt)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-2)] hover:bg-[color:var(--bone-2)]")
                  }
                >
                  {langName(c)}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={create} disabled={!!err} className={BTN_PRIMARY}>
                create system
              </button>
              {err && targets.length > 0 && <span className="text-[12px] text-[color:var(--basalt-3)]">{ERROR_TEXT[err]}</span>}
            </div>
          </Panel>
          {guest && systems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3" data-guest-save>
              <p className="text-[12px] text-[color:var(--basalt-2)]">Saved on this device.</p>
              <button type="button" onClick={() => requireAccount(() => void persist({}))} className={BTN_SECONDARY}>
                save to your account
              </button>
            </div>
          ) : (
            <SaveNotice state={saveState} />
          )}
          <p className="text-[11px] text-[color:var(--basalt-3)]">{corpus.attribution}</p>
        </>
      )}
    </div>
  );
}
