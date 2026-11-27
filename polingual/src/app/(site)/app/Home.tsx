"use client";

import Link from "next/link";
import { LANGS, langName, progressBranch, type LangSystem } from "@academy/lang-systems";
import { appHref, levelText, nextToPlace } from "@/lib/app/systems";
import { useEffect, useState } from "react";
import { webProgressStore } from "@academy/progress-store";
import { streakCard, type StreakCard as StreakData } from "@/lib/app/streak";
import { langProgress, type LangProgress } from "@/lib/app/lang-progress";
import { bookFromBranch, mergeRooms, readRooms, roomDays, ROOM_BRANCH } from "@/lib/family/results";
import { local } from "@/lib/storage";
import { loadCognates } from "@academy/cognate-coverage";
import { langBranch, memoryState, mergeMemory, normalizeMemory } from "@academy/lang-memory";
import { browserMemoryIO } from "@academy/lang-memory-store";
import LangProgressRow from "./LangProgress";
import NewSystem from "./NewSystem";
import StreakCard from "./StreakCard";
import { useSystems } from "./useSystems";
import styles from "./app.module.css";
import { ButtonLink, Card, Stage, Tag } from "@/ui";

function useStreakCard(systems: LangSystem[] | null) {
  const [card, setCard] = useState<{ streak: StreakData; langs: LangProgress[] } | null>(null);
  useEffect(() => {
    if (!systems?.length) return;
    let live = true;
    const langs = Array.from(new Set(systems.flatMap((s) => s.targets))).sort();
    void webProgressStore.pull().then(async (server) => {
      const states = await Promise.all(systems.map((s) => webProgressStore.load(progressBranch(s), server)));
      const memories = langs.map((l) => mergeMemory(normalizeMemory(l, browserMemoryIO.readRaw(langBranch(l))), normalizeMemory(l, server?.[langBranch(l)]?.data)));
      const now = Date.now();
      const indexes = langs.length > 1 ? await Promise.all(langs.map((l) => loadCognates(l))) : [];
      const cognates = Object.fromEntries(indexes.flatMap((x, i) => (x ? [[langs[i], x]] : [])));
      const progress = langProgress(memories, now, cognates);
      if (live) setCard({ streak: streakCard([...states, ...memories.map((m) => memoryState(m))], now, [...progress.inputDays, ...roomDays(mergeRooms(readRooms(local()), bookFromBranch(server?.[ROOM_BRANCH]?.data)))]), langs: progress.langs });
    });
    return () => {
      live = false;
    };
  }, [systems]);
  return card;
}

function SystemTile({ s }: { s: LangSystem }) {
  const toPlace = nextToPlace(s);
  return (
    <Card as="li" className={styles.tile} data-testid="system-tile">
      <h2 className={styles.tileTitle}>{s.name}</h2>
      <p className={styles.small}>From {langName(s.root)}</p>
      <ul className={styles.chips} aria-label={`${s.name} languages`}>
        {s.targets.map((t) => (
          <li key={t} lang={LANGS[t]?.bcp47}>
            <Tag>
              {langName(t)} <span className={styles.level}>{levelText(s, t)}</span>
            </Tag>
          </li>
        ))}
      </ul>
      <div className={styles.row}>
        <ButtonLink href={appHref.study(s.id)}>Start today</ButtonLink>
        {toPlace ? (
          <ButtonLink variant="ghost" size="md" href={appHref.place(s.id, toPlace)}>
            Place {langName(toPlace)}
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}

export default function Home() {
  const { state, create } = useSystems();
  const card = useStreakCard(state.status === "ready" ? state.systems : null);
  if (state.status === "loading")
    return (
      <p className={styles.muted} aria-busy="true">
        Loading your languages
      </p>
    );
  if (state.status === "error") return <p className={styles.error}>Your languages did not load. Reload the page to try again.</p>;
  if (state.systems.length === 0) return <NewSystem first create={create} />;
  return (
    <Stage>
      <section className={styles.stack} data-testid="app-home">
        <div>
          <p className={styles.label}>Your language systems</p>
          <h1 className={styles.title}>Pick up where you left off</h1>
        </div>
        {card ? (
          <div className={styles.streakRowWrap}>
            <StreakCard card={card.streak} />
            <LangProgressRow langs={card.langs} />
          </div>
        ) : null}
        <ul className={styles.grid}>
          {state.systems.map((s) => (
            <SystemTile key={s.id} s={s} />
          ))}
        </ul>
        <Link className={styles.link} href={appHref.create}>
          Add a language system
        </Link>
      </section>
    </Stage>
  );
}
