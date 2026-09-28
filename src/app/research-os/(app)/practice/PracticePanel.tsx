"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BTN_SECONDARY } from "@/components/ui";
import type { LearningModule, ModuleItem, ModuleKind } from "@/lib/research-os/modules/generate";

const LABEL: Record<ModuleKind, string> = {
  recall: "recall cards",
  drill: "drills",
  worked: "worked problems",
  quiz: "quiz",
  path: "path lesson",
};

interface Body {
  node: { id: string; slug: string; title: string };
  modules: LearningModule[];
}

type Load = { kind: "loading" } | { kind: "hidden" } | { kind: "error"; message: string } | { kind: "ready"; body: Body };

export default function PracticePanel({ node, compact = false }: { node: string; compact?: boolean }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [tab, setTab] = useState<ModuleKind>("drill");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/research-os/modules?node=${encodeURIComponent(node)}`, { cache: "no-store" });
        if (!live) return;
        if (res.status === 404 && compact) return setLoad({ kind: "hidden" });
        if (!res.ok) return setLoad({ kind: "error", message: res.status === 404 ? "No such node, or you cannot read it." : `Practice is unavailable (${res.status}).` });
        setLoad({ kind: "ready", body: (await res.json()) as Body });
      } catch {
        if (live) setLoad(compact ? { kind: "hidden" } : { kind: "error", message: "Practice could not reach the server." });
      }
    })();
    return () => {
      live = false;
    };
  }, [node, compact]);

  if (load.kind === "hidden") return null;
  if (load.kind === "loading") return compact ? null : <p className="mt-6 text-[13px] text-[color:var(--basalt-3)]">Loading practice.</p>;
  if (load.kind === "error") return <p role="alert" className="mt-6 text-[13px] text-[color:var(--basalt)]">{load.message}</p>;

  const mod = load.body.modules.find((m) => m.kind === tab);
  return (
    <section className={`${compact ? "" : "mt-6 "}border border-[color:var(--hairline)] rounded-sm bg-[color:var(--bone)]/70`} aria-label="practice">
      <div className="flex flex-wrap items-center gap-1 border-b border-[color:var(--hairline)] px-2">
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)] px-2 py-3">practice</span>
        {load.body.modules.map((m) => {
          const count = m.kind === "path" ? m.steps.length + (m.lesson ? 1 : 0) : m.items.length;
          return (
            <button
              key={m.kind}
              type="button"
              aria-pressed={tab === m.kind}
              onClick={() => setTab(m.kind)}
              className={"small-caps text-[10px] tracking-[0.14em] px-3 py-3 min-h-[44px] border-b-2 " + (tab === m.kind ? "border-[color:var(--gold)] text-[color:var(--basalt)]" : "border-transparent text-[color:var(--basalt-3)]")}
            >
              {LABEL[m.kind]} · {count}
            </button>
          );
        })}
        {compact && (
          <Link href={`/research-os/practice?node=${encodeURIComponent(load.body.node.slug)}`} className="ml-auto text-[12px] underline underline-offset-4 text-[color:var(--basalt-3)] px-2">
            open
          </Link>
        )}
      </div>
      <div className="p-4">{mod ? <ModuleView mod={mod} /> : null}</div>
    </section>
  );
}

function ModuleView({ mod }: { mod: LearningModule }) {
  if (mod.kind === "path") {
    return (
      <div className="flex flex-col gap-4">
        {mod.steps.length > 0 ? (
          <ol className="flex flex-col gap-1 text-[13px] text-[color:var(--basalt-2)] list-decimal pl-5">
            {mod.steps.map((s) => (
              <li key={s.id}>
                <Link href={`/research-os/n/${s.slug}`} className="underline underline-offset-4">{s.title}</Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-[color:var(--basalt-3)]">No prerequisites in the graph.</p>
        )}
        {mod.lesson?.depths.map((d) => (
          <div key={d.level}>
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">{d.level}</div>
            <p className="mt-1 text-[14px] leading-[1.6] text-[color:var(--basalt)]">{d.text}</p>
          </div>
        ))}
      </div>
    );
  }
  if (mod.items.length === 0) return <p className="text-[13px] text-[color:var(--basalt-3)]">Nothing to practice here yet.</p>;
  return (
    <ol className="flex flex-col gap-4">
      {mod.items.map((it) => (
        <Item key={it.id} item={it} />
      ))}
    </ol>
  );
}

function Item({ item }: { item: ModuleItem }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const done = picked !== null || shown;
  return (
    <li className="flex flex-col gap-2">
      <p className="text-[14px] text-[color:var(--basalt)]">{item.prompt}</p>
      {item.lines.map((l, i) => (
        <p key={i} className="border-l-2 border-[color:var(--hairline)] pl-3 text-[14px] leading-[1.5] text-[color:var(--basalt-2)]">{l}</p>
      ))}
      {item.choices ? (
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="choices">
          {item.choices.map((c) => {
            const tone = !done ? "" : c === item.answer ? " border-[color:var(--aegean-deep)]" : c === picked ? " opacity-60" : "";
            return (
              <button key={c} type="button" disabled={done} onClick={() => setPicked(c)} className={"text-left border border-[color:var(--hairline)] bg-white/50 hover:bg-[color:var(--bone-2)] px-3 py-2 rounded-sm min-h-[44px] text-[13px]" + tone}>
                {c}
              </button>
            );
          })}
        </div>
      ) : (
        !shown && (
          <div>
            <button type="button" onClick={() => setShown(true)} className={BTN_SECONDARY}>show answer</button>
          </div>
        )
      )}
      {done && (
        <div role="status" className="text-[13px] text-[color:var(--basalt-2)]">
          {item.choices ? <span className="small-caps text-[11px] tracking-[0.14em] mr-2">{picked === item.answer ? "right" : "missed"}</span> : null}
          {item.choices ? item.explain : item.answer}
        </div>
      )}
    </li>
  );
}
