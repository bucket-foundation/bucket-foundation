"use client";

import { useEffect, useMemo, useState } from "react";
import type { LangCorpus } from "@academy/lang-systems";
import { langName } from "@academy/lang-systems";
import { loadLangCorpus } from "@academy/lang-client";
import { usePlayer } from "@/lib/listen/player";
import { radioName, radioStations, type RadioStation } from "@/lib/listen/radio";
import { Button, Eyebrow, FlagTile, Lede, Pill, Sheet, Stage, Title } from "@/ui";
import { Art } from "@/ui/art";
import { useSystems } from "../useSystems";
import styles from "./listen.module.css";

const STICKERS = [
  { name: "bunting" as const, x: "4%", y: "8%", size: 190, rotate: -6 },
  { name: "script-ko" as const, x: "10%", y: "48%", size: 80, rotate: 8, shadow: false },
  { name: "seal" as const, x: "6%", y: "12%", size: 120, rotate: 9, side: "right" as const },
  { name: "kente" as const, x: "3%", y: "64%", size: 180, rotate: -10, side: "right" as const },
];

const LATIN = /^[\p{Script=Latin}\p{P}\p{N}\s]+$/u;

function heard(corpus: LangCorpus | null, lang: string): { word: string; reading?: string } | null {
  const item = corpus?.byId.get("hear");
  const word = item?.forms[lang];
  if (!word) return null;
  const r = item?.readings[lang];
  return { word, reading: LATIN.test(word) ? undefined : (r?.roman ?? r?.kana ?? r?.ipa) };
}

function useStations(active: string) {
  const [stations, setStations] = useState<RadioStation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setStations(null);
    setError(null);
    radioStations(active)
      .then((s) => live && setStations(s))
      .catch(() => live && (setStations([]), setError("The station list did not load. Check your connection and try again.")));
    return () => {
      live = false;
    };
  }, [active]);
  return { stations, error };
}

type Player = ReturnType<typeof usePlayer>;

function NowPlaying({ player, active, corpus }: { player: Player; active: string; corpus: LangCorpus | null }) {
  const now = player.station;
  if (!now) return null;
  const word = heard(corpus, player.lang ?? active);
  return (
    <div className={styles.ticket} data-testid="now-playing">
      <div className={styles.ticketText}>
        <span className={styles.ticketCap}>Now playing · {langName(player.lang ?? active)}</span>
        <b className={styles.ticketName}>{now.name}</b>
        <span className={styles.ticketMeta}>{player.error ?? (player.buffering ? "Tuning in" : [now.country, now.tags.split(",").slice(0, 2).join(", ")].filter(Boolean).join(" · "))}</span>
      </div>
      {word ? (
        <div className={styles.ticketTile} data-testid="now-word">
          <FlagTile as="div" lang={player.lang ?? active} code={(player.lang ?? active).toUpperCase()} label="hear" word={word.word} reading={word.reading} />
        </div>
      ) : null}
      <Button size="lg" variant={player.playing ? "secondary" : "primary"} onClick={player.toggle} data-testid="now-toggle">{player.playing ? "Pause" : "Play"}</Button>
    </div>
  );
}

function StationItem({ s, player, active }: { s: RadioStation; player: Player; active: string }) {
  const here = player.station?.stationuuid === s.stationuuid;
  const on = here && player.playing;
  return (
    <li>
      <Button bare className={styles.station} aria-pressed={on} onClick={() => (here ? player.toggle() : player.play(s, active))} data-testid="station">
        <span className={styles.stationArt} aria-hidden><Art name={on ? "streak-flame" : "ticket"} size={40} /></span>
        <span className={styles.stationText}>
          <b>{s.name}</b>
          <span>{[s.country, s.tags.split(",").slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</span>
        </span>
        <span className={styles.stationAct}>{on ? "Pause" : "Play"}</span>
      </Button>
    </li>
  );
}

export default function Listen() {
  const { state } = useSystems();
  const player = usePlayer();
  const langs = useMemo(() => {
    const t = state.status === "ready" ? [...new Set(state.systems.flatMap((s) => s.targets))].filter((l) => radioName(l)) : [];
    return t.length ? t : ["es", "fr"];
  }, [state]);
  const [lang, setLang] = useState<string | null>(null);
  const active = lang ?? player.lang ?? langs[0];
  const { stations, error } = useStations(active);
  const [corpus, setCorpus] = useState<LangCorpus | null>(null);

  useEffect(() => {
    void loadLangCorpus().then(setCorpus);
  }, []);

  return (
    <Stage ground="cut" stickers={STICKERS} tiles={false}>
      <Sheet tone="tyrian" className={styles.sheet} data-testid="listen">
        <Eyebrow onDark>Listen</Eyebrow>
        <Title onDark>Live radio in the languages you study</Title>
        <Lede onDark>It keeps playing while you move around Polingual.</Lede>
        <div className={styles.langs} role="tablist" aria-label="Radio language">
          {langs.map((l) => (
            <Pill key={l} role="tab" aria-selected={l === active} active={l === active} onClick={() => setLang(l)} data-testid={`radio-lang-${l}`}>{langName(l)}</Pill>
          ))}
        </div>
        <NowPlaying player={player} active={active} corpus={corpus} />
        {stations === null ? <p className={styles.body} aria-busy="true">Finding stations</p> : null}
        {stations?.length === 0 ? <p className={styles.body} role="status">{error ?? `No stations found for ${langName(active)}.`}</p> : null}
        <ul className={styles.list}>
          {stations?.map((s) => <StationItem key={s.stationuuid} s={s} player={player} active={active} />)}
        </ul>
        <p className={styles.credit}>Stations from radio-browser.info</p>
      </Sheet>
    </Stage>
  );
}
