"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LANGS, langName } from "@academy/lang-systems";
import type { WebLobbyState } from "@/lib/lobby/client";
import { LEARN_HREF } from "@/lib/lobby/client";
import { local } from "@/lib/storage";
import { syncDeps } from "@/lib/daily/browser-sync";
import { podium, roomRecord, wordOfNight } from "@/lib/family/after";
import { recordRoom, type SaveState } from "@/lib/family/results";
import { currentCard } from "@/lib/family/session";
import { cardSvg, challengeGame, challengeHref, shareMessage } from "@/lib/family/share";
import { Button, ButtonLink } from "@/ui";
import { useRoomCards } from "./LanguageMap";
import FamilyNight from "./FamilyNight";
import { homeSpeakersOf, teacherAwards } from "@academy/fair-score";
import f from "./family.module.css";
import { appAuth } from "@/lib/app/auth";
import { fetchLeague, leagueEligible, nearMe, postLeague, type LeagueBoard } from "@/lib/family/league";

const SAVE_TEXT: Record<SaveState, string> = {
  account: "Saved to your account. Today counts toward your streak.",
  device: "Saved on this phone. Sign in to keep it on your account.",
  skipped: "Kid seats keep nothing after the room closes.",
  failed: "Saved on this phone. Your account sync failed, so it tries again next game.",
};

export default function AfterGame({ lobby, token, onSignIn }: { lobby: WebLobbyState; token: string | null; onSignIn?: () => void }) {
  const card = useMemo(() => currentCard(), []);
  const learn = useMemo(() => card?.learn ?? lobby.targets, [card, lobby.targets]);
  const [saved, setSaved] = useState<SaveState | null>(null);
  const rec = useMemo(() => roomRecord(lobby, learn, Date.now()), [lobby, learn]);
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!rec || done.current === rec.key) return;
    done.current = rec.key;
    void recordRoom(rec, card?.band ?? "under13", local(), syncDeps()).then((r) => setSaved(r.saved));
  }, [rec, card]);
  return (
    <section className={f.card} aria-label="After the game" data-testid="after-game">
      {saved ? <p className={f.muted} data-testid="room-saved">{SAVE_TEXT[saved]}</p> : null}
      {saved === "device" && onSignIn ? <Button variant="ghost" size="md" onClick={onSignIn} data-testid="after-sign-in">Save to an account</Button> : null}
      {saved === "account" && leagueEligible(card?.band, true) ? <League lobbyId={lobby.id} gameKey={rec?.key ?? ""} /> : null}
      <Teachers lobby={lobby} token={token} />
      <Review words={rec?.missed ?? []} />
      <ShareCard lobby={lobby} token={token} />
      <FamilyNight nickname={card?.band === "under13" ? "" : card?.nickname ?? ""} host={lobby.isHost && card?.band !== "under13"} />
    </section>
  );
}

function League({ lobbyId, gameKey }: { lobbyId: string; gameKey: string }) {
  const [state, setState] = useState<{ added: number | null; board: LeagueBoard | null } | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const t = await appAuth().mobile.accessToken().catch(() => null);
      if (!t) return;
      const added = await postLeague(window.fetch.bind(window), t, lobbyId);
      const board = await fetchLeague(window.fetch.bind(window), t);
      if (live) setState({ added, board });
    })();
    return () => {
      live = false;
    };
  }, [lobbyId, gameKey]);
  if (!state?.board) return null;
  return (
    <div className={f.map} data-testid="league">
      <p className={f.step}>{state.board.tierName} league{state.added ? ` · +${state.added}` : ""}</p>
      <ol className={f.people}>
        {nearMe(state.board.board).map((r) => <li key={r.rank} data-me={r.me}><span className={f.who}>#{r.rank} {r.name}</span> {r.points}</li>)}
      </ol>
    </div>
  );
}

function Teachers({ lobby, token }: { lobby: WebLobbyState; token: string | null }) {
  const { seats } = useRoomCards(lobby, token);
  const langs = new Map(lobby.prompts.flatMap((p) => (p.lang ? [[p.round, p.lang] as [number, string]] : [])));
  const awards = teacherAwards(langs, lobby.results, homeSpeakersOf(seats));
  if (!awards.size) return null;
  return (
    <ul className={f.chips} data-testid="teacher-awards">
      {[...awards].map(([id, n]) => <li key={id}>🎓 {seats.find((s) => s.userId === id)?.name ?? "Teacher"} taught {n}</li>)}
    </ul>
  );
}

function Review({ words }: { words: { lang: string; word: string; meaning: string }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  if (!words.length) return <p className={f.muted}>No missed words this game.</p>;
  return (
    <>
      <p className={f.step}>Review {words.length} missed words</p>
      <div className={f.review} data-testid="review-cards">
        {words.map((w, i) => (
          <button key={`${w.lang}:${w.word}`} type="button" className={f.flip} data-open={open.has(i)} lang={open.has(i) ? undefined : LANGS[w.lang]?.bcp47} onClick={() => setOpen(new Set(open).add(i))} aria-label={open.has(i) ? `${w.word} means ${w.meaning}` : `${w.word}, tap to see the meaning`}>
            {open.has(i) ? w.meaning : w.word}
          </button>
        ))}
      </div>
      <ButtonLink variant="ghost" size="md" href={LEARN_HREF} data-testid="review-study">Study these in the app</ButtonLink>
    </>
  );
}

function colors(): { bg: string; ink: string; accent: string } {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => s.getPropertyValue(n).trim() || d;
  return { bg: v("--pl-paper", "white"), ink: v("--pl-ink", "black"), accent: v("--pl-tyrian", "purple") };
}

async function pngFrom(url: string): Promise<Blob | null> {
  const img = new Image();
  img.src = url;
  await img.decode().catch(() => null);
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1080;
  c.getContext("2d")?.drawImage(img, 0, 0);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

function ShareCard({ lobby, token }: { lobby: WebLobbyState; token: string | null }) {
  const { seats, share } = useRoomCards(lobby, token);
  const [src, setSrc] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const top = podium(lobby);
  const word = wordOfNight(lobby);
  const langs = Array.from(new Set(seats.flatMap((s) => s.card.speaks.map((x) => x.lang)))).map(langName);
  const svg = cardSvg({ podium: top, langs: langs.length ? langs : lobby.targets.map(langName), word }, { bg: "white", ink: "black", accent: "purple" });
  useEffect(() => {
    const out = svg.replace('fill="white"', `fill="${colors().bg}"`).replaceAll('fill="black"', `fill="${colors().ink}"`).replaceAll('fill="purple"', `fill="${colors().accent}"`);
    setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(out)}`);
  }, [svg]);
  if (!share) return <p className={f.muted} data-testid="share-off">The host turned sharing off for this room.</p>;
  const url = challengeHref({ game: challengeGame(lobby.game), seed: lobby.seed, root: lobby.root, targets: lobby.targets, rounds: lobby.rounds, score: top[0]?.score ?? 0, mixed: lobby.playlist.length > 0 }, window.location.origin);
  const send = async () => {
    const png = src ? await pngFrom(src) : null;
    const text = shareMessage(word?.word ?? null, top[0]?.score ?? 0, url);
    const file = png ? new File([png], "polingual-family-night.png", { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
      else if (navigator.share) await navigator.share({ text, url });
      else await navigator.clipboard.writeText(text);
      setDone(true);
    } catch {
      return;
    }
  };
  return (
    <>
      <p className={f.step}>Share the night</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img className={f.shareImg} src={src} alt={`Podium: ${top.map((p) => p.name).join(", ")}${word ? `. Word of the night: ${word.word}` : ""}`} data-testid="share-card" /> : null}
      <div className={f.nav}>
        <Button size="md" onClick={() => void send()} data-testid="share-send">{done ? "Shared" : "Share"}</Button>
        <ButtonLink variant="ghost" size="md" href={url} target="_blank" rel="noopener" data-testid="share-link">Play this set</ButtonLink>
      </div>
    </>
  );
}
