"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { allMilestones, shareText, type MilestoneProgress } from "@/lib/academy/lang-milestones";
import { langDir } from "@/lib/academy/lang-systems";
import { cardBlob, drawMilestoneCard } from "@/lib/academy/milestone-card";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";
import { useLangSystem } from "./useLangSystem";

function ShareButton({ p }: { p: MilestoneProgress }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function share() {
    if (!canvas.current) return;
    setMsg(null);
    try {
      drawMilestoneCard(canvas.current, p);
      const blob = await cardBlob(canvas.current);
      const file = new File([blob], `${p.milestone.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText(p) });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Card saved as an image.");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMsg((e as Error).message || "The card did not share.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" className={BTN_PRIMARY} onClick={share} data-testid={`share-${p.milestone.id}`}>
        share card
      </button>
      {msg && <span className="text-[12px] text-[color:var(--basalt-3)]" role="status">{msg}</span>}
      <canvas ref={canvas} className="hidden" aria-hidden="true" />
    </div>
  );
}

export default function LangMilestones({ systemId }: { systemId: string }) {
  const h = useLangSystem(systemId);
  const { system, corpus, state } = h;
  const list = useMemo(() => (system && corpus ? allMilestones(system, corpus, state) : []), [system, corpus, state]);

  if (h.status === "loading") return <LoadingState label="Loading milestones" />;
  if (h.status === "error") return <ErrorState title="Milestones did not load" />;
  if (!system || !corpus) return <EmptyState title="No such language system" action={{ href: "/research-os/learn/languages", label: "your systems" }} />;
  const back = `/research-os/learn/languages/${system.id}`;

  return (
    <div className="flex flex-col gap-4 max-w-2xl min-w-0">
      <PageHeader
        eyebrow={system.name}
        title="milestones"
        lede={`${list.filter((p) => p.earned).length} of ${list.length} earned. Each one counts once you have answered every word in every language of the set in review.`}
        actions={
          <>
            <Link href={`${back}/study`} className={BTN_PRIMARY}>study</Link>
            <Link href={back} className={BTN_SECONDARY}>progress</Link>
          </>
        }
      />
      {list.map((p) => (
        <Panel key={p.milestone.id} title={p.milestone.title} meta={p.earned ? "earned" : `${p.learned} of ${p.total}`}>
          <ul className="flex flex-col gap-1 text-[14px]" data-testid={`milestone-${p.milestone.id}`}>
            {p.langs.map((l) => (
              <li key={l.lang} className="flex gap-3">
                <span className="w-24 shrink-0 text-[color:var(--basalt-3)]">{l.name}</span>
                {l.missing.length ? (
                  <span className="text-[color:var(--basalt-3)]" data-testid={`missing-${l.lang}`}>not in the {l.name} deck yet: {l.missing.join(", ")}</span>
                ) : (
                  <span lang={l.lang} dir={langDir(l.lang)} className={l.done ? "" : "opacity-50"}>{l.words.map((w) => w.form).join(" · ")}</span>
                )}
              </li>
            ))}
          </ul>
          {p.earned && <div className="mt-3"><ShareButton p={p} /></div>}
        </Panel>
      ))}
    </div>
  );
}
