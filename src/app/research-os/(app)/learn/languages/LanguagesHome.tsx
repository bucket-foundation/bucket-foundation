"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { normalizeState, type EngineState } from "@/lib/academy/engine";
import { useAccountGate } from "@/lib/academy/account-gate-context";
import { loadLangCorpus, loadSystems, saveSystems, type SaveResult, type SystemsChange } from "@/lib/academy/lang-client";
import SaveNotice from "./SaveNotice";
import {
  availableSystems,
  createSystem,
  LANG_CODES,
  langName,
  MAX_TARGETS,
  PRESETS,
  progressBranch,
  SYSTEM_ROOT,
  systemSummary,
  validateSystem,
  type LangCorpus,
  type LangSystem,
  type SystemError,
  LANGS,
} from "@/lib/academy/lang-systems";
import { webProgressStore } from "@/lib/academy/progress-store";
import { sharedMemoryActive } from "@/lib/academy/lang-memory";
import { browserMemoryIO, openShared } from "@/lib/academy/lang-memory-store";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";

const ERROR_TEXT: Record<SystemError, string> = {
  "no-targets": "Pick at least one language to learn.",
  "too-many": `Pick ${MAX_TARGETS} languages at most.`,
  "unknown-language": "That language is not in the course.",
  "root-in-targets": "The root language cannot also be a target.",
  duplicate: "You already have this system.",
};

const ON_GOLD = "text-[color:var(--on-gold,var(--basalt))]";
const PRIMARY = BTN_PRIMARY.replace("text-[color:var(--basalt)]", ON_GOLD);
const SECONDARY = `${BTN_SECONDARY} bg-[color:var(--bone)]`;
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gold-deep)]";
const START = `${PRIMARY} ${FOCUS} w-full sm:w-auto hover:underline underline-offset-4`;

function placementText(s: LangSystem): string {
  const placed = s.targets.filter((t) => t in s.placement).length;
  if (placed === 0) return "not taken";
  if (placed === s.targets.length) return "done";
  return `${placed} of ${s.targets.length} languages`;
}

function SystemCard({ name, targets, owned, placement, progress, share, action }: { name: string; targets: string[]; owned: boolean; placement: string; progress: string; share: number; action: ReactNode }) {
  return (
    <article
      data-system-card={owned ? "owned" : "available"}
      className={
        "flex flex-col gap-4 rounded-sm border p-5 transition-colors hover:border-[color:var(--gold-deep)] focus-within:border-[color:var(--gold-deep)] " +
        (owned ? "border-[color:var(--gold-deep)] bg-[color:var(--bone)] shadow-[inset_3px_0_0_var(--gold)]" : "border-[color:var(--hairline)] bg-[color:var(--bone)]")
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display uppercase text-[15px] leading-tight tracking-[0.06em] text-[color:var(--basalt)]">{name}</h3>
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">{owned ? "yours" : "available"}</span>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label={`${name} languages`}>
        {targets.map((t) => (
          <li key={t} lang={LANGS[t]?.bcp47} className="rounded-sm border border-[color:var(--hairline)] px-2 py-0.5 text-[12px] text-[color:var(--basalt-2)]">
            {langName(t)}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] [font-variant-numeric:tabular-nums]">
        <div>
          <dt className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">placement</dt>
          <dd className="mt-0.5 text-[color:var(--basalt-2)]">{placement}</dd>
        </div>
        <div>
          <dt className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">progress</dt>
          <dd className="mt-0.5 text-[color:var(--basalt-2)]">{progress}</dd>
        </div>
      </dl>
      <span className="block h-1 overflow-hidden rounded-full bg-[color:var(--hairline)]" aria-hidden>
        <span className="block h-full bg-[color:var(--gold)]" style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
      <div className="mt-auto">{action}</div>
    </article>
  );
}

export default function LanguagesHome({ hub = false, builder = true }: { hub?: boolean; builder?: boolean }) {
  const router = useRouter();
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
        for (const s of list) st[s.id] = sharedMemoryActive() ? (await openShared(browserMemoryIO, s, list, server)).view : await webProgressStore.load(progressBranch(s), server);
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

  function start(targets: string[]) {
    if (!systems) return;
    const make = () => {
      const s = createSystem(SYSTEM_ROOT, targets, systems);
      setSystems([...systems, s]);
      void persist({ upsert: s });
      router.push(`/research-os/learn/languages/${s.id}/place`);
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

  function builderBody() {
    return (
      <>
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
                <button key={p.name} type="button" onClick={() => setTargets(p.targets.filter((t) => t !== root))} className={SECONDARY}>
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
                    (targets.includes(c) ? `bg-[color:var(--gold)] border-[color:var(--gold-deep)] ${ON_GOLD}` : "bg-[color:var(--bone)] border-[color:var(--basalt-3)] text-[color:var(--basalt)] hover:bg-[color:var(--bone-2)]")
                  }
                >
                  {langName(c)}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={create} disabled={!!err} className={PRIMARY}>
                create system
              </button>
              {err && targets.length > 0 && <span className="text-[12px] text-[color:var(--basalt-3)]">{ERROR_TEXT[err]}</span>}
            </div>
      </>
    );
  }

  if (hub) {
    const open = systems ? availableSystems(systems) : [];
    return (
      <section className="flex flex-col gap-6" aria-labelledby="lang-systems-title" data-learn-hub="languages">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[color:var(--hairline)] pb-4">
          <div className="min-w-0 max-w-2xl">
            <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">learn</div>
            <h2 id="lang-systems-title" className="mt-1 font-display uppercase text-[clamp(1.25rem,3vw,1.875rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
              language systems
            </h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">A set of languages learned together from English, with a placement for each and shared roots side by side.</p>
          </div>
          <Link href="/research-os/learn/languages" className={`${SECONDARY} ${FOCUS}`}>
            build your own
          </Link>
        </header>
        {error ? (
          <ErrorState title="The language course did not load" body="The language corpus files are missing from this deployment." />
        ) : systems === null || corpus === null ? (
          <LoadingState label="Loading your language systems" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="lang-systems">
              {systems.map((s) => {
                const sum = systemSummary(s, corpus, states[s.id] ?? normalizeState(null));
                const fresh = sum.started === 0 && Object.keys(s.placement).length === 0;
                const href = fresh ? `/research-os/learn/languages/${s.id}/place` : `/research-os/learn/languages/${s.id}/study`;
                return (
                  <SystemCard
                    key={s.id}
                    name={s.name}
                    targets={s.targets}
                    owned
                    placement={placementText(s)}
                    progress={`${sum.started} of ${sum.total} cards${sum.due > 0 ? `, ${sum.due} due` : ""}`}
                    share={sum.started / Math.max(1, sum.total)}
                    action={
                      <Link href={href} className={START}>
                        {fresh ? "start" : sum.due > 0 ? "review" : "continue"}
                      </Link>
                    }
                  />
                );
              })}
              {open.map((c) => (
                <SystemCard
                  key={c.name}
                  name={c.name}
                  targets={c.targets}
                  owned={false}
                  placement="not taken"
                  progress="not started"
                  share={0}
                  action={
                    <button type="button" onClick={() => start(c.targets)} className={START} aria-label={`start ${c.name}`}>
                      start
                    </button>
                  }
                />
              ))}
            </div>
            {builder && <Panel title="new system">{builderBody()}</Panel>}
            {guest && systems.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3" data-guest-save>
                <p className="text-[12px] text-[color:var(--basalt-2)]">Saved on this device.</p>
                <button type="button" onClick={() => requireAccount(() => void persist({}))} className={`${SECONDARY} ${FOCUS}`}>
                  save to your account
                </button>
              </div>
            ) : (
              <SaveNotice state={saveState} />
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research OS · learn · languages"
        title="language systems"
        lede="Learn a set of languages together from one root language. Each word comes back in every language of the set, mixed in one queue, with shared roots shown side by side."
        actions={
          <Link href="/research-os/learn" className={SECONDARY}>
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
                        <Link href={`/research-os/learn/languages/${s.id}/place`} className={PRIMARY}>
                          placement
                        </Link>
                      ) : (
                        <Link href={`/research-os/learn/languages/${s.id}/study`} className={PRIMARY}>
                          {sum.due > 0 ? "review" : "continue"}
                        </Link>
                      )}
                      {sum.started === 0 && (
                        <Link href={`/research-os/learn/languages/${s.id}/study`} className={SECONDARY}>
                          start from zero
                        </Link>
                      )}
                      <Link href={`/research-os/learn/languages/${s.id}`} className={SECONDARY}>
                        progress
                      </Link>
                      <button type="button" onClick={() => remove(s.id)} className="bg-transparent text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-2)] px-2">
                        remove
                      </button>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}

          <Panel title="new system">
            {builderBody()}
          </Panel>
          {guest && systems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3" data-guest-save>
              <p className="text-[12px] text-[color:var(--basalt-2)]">Saved on this device.</p>
              <button type="button" onClick={() => requireAccount(() => void persist({}))} className={SECONDARY}>
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
