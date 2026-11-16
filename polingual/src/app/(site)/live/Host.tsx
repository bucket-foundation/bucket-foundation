"use client";

import { useCallback, useEffect, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import SignIn from "../app/SignIn";
import { Brand } from "./parts";
import { MixBar, useStage } from "./show";
import styles from "./stoa.module.css";
import { Stage } from "@/ui";
import { HostBoard } from "./host/Board";
import { HostSetup, useHostSettings } from "./host/Setup";
import { useHostCues } from "./host/useHostCues";
import { useHostRoom } from "./host/useHostRoom";

const TERMS_KEY = "stoa/host-terms/v1";
const HOST_COPY = {
  label: "Polingual Live",
  title: "Sign in to host a live game",
  intro: "Hosting puts a quiz on your screen. Players join from their phones with a room code and need no account.",
};

type Auth = "loading" | "signed-out" | "signed-in";

function useTerms() {
  const [terms, setTerms] = useState(false);
  useEffect(() => {
    try {
      setTerms(localStorage.getItem(TERMS_KEY) === "1");
    } catch {
      setTerms(false);
    }
  }, []);
  const accept = (on: boolean) => {
    setTerms(on);
    try {
      if (on) localStorage.setItem(TERMS_KEY, "1");
      else localStorage.removeItem(TERMS_KEY);
    } catch {
      return;
    }
  };
  return [terms, accept] as const;
}

export default function Host() {
  const [auth, setAuth] = useState<Auth>("loading");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [origin, setOrigin] = useState("https://polingual.com");
  const [terms, acceptTerms] = useTerms();
  const settings = useHostSettings();
  const { stage, mix, setMix, ready, unlock } = useStage({ music: true, voice: true, sfx: true });

  const refresh = useCallback(async () => {
    setAuth((await appAuth().userId()) ? "signed-in" : "signed-out");
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    void refresh();
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [refresh]);

  const h = useHostRoom(setError, refresh);
  const { room, snap } = h;
  const moves = useHostCues(snap, now, h.offset, stage);

  const view = (() => {
    if (auth === "loading") return null;
    if (auth === "signed-out") return <Stage><SignIn onSignedIn={() => void refresh()} copy={HOST_COPY} flame={false} /></Stage>;
    if (!room) return <HostSetup s={settings} terms={terms} onTerms={acceptTerms} busy={h.busy} onCreate={() => void h.create(settings.settings)} />;
    if (!snap) return <p className={styles.muted}>Opening the room.</p>;
    return <HostBoard h={h} room={room} snap={snap} now={now} origin={origin} moves={moves} />;
  })();

  return (
    <div className={styles.page} onClick={unlock} onTouchEnd={unlock} onKeyDown={unlock}>
      <header className={styles.bar}>
        <Brand link={!snap?.room.school_mode} />
        {room && snap?.room.school_mode ? <span className={styles.label}>School mode</span> : null}
        {auth === "signed-in" ? <MixBar mix={mix} setMix={setMix} ready={ready} unlock={unlock} full /> : null}
      </header>
      <main className={styles.main} data-testid="host">
        {view}
        {error ? <p role="alert" className={styles.error} data-testid="host-error">{error}</p> : null}
      </main>
    </div>
  );
}
