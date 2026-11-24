"use client";

import { useNow } from "@/lib/hooks/clock";
import { useEffect, useState } from "react";
import { normalizeCode } from "@/lib/stoa/client";
import { nicknameChoices } from "@/lib/stoa/nicknames";
import { findSeat, seatStore, type Seat } from "@/lib/stoa/seat";
import { Brand } from "../live/parts";
import { MixBar, useStage } from "../live/show";
import styles from "../live/stoa.module.css";
import JoinStickers from "./JoinStickers";
import { Button } from "@/ui";
import { BackCard, CodeCard, NameCard } from "./phone/Entry";
import { PhoneLive } from "./phone/Live";
import { usePhoneActions } from "./phone/usePhoneActions";
import { usePhoneCues } from "./phone/usePhoneCues";
import { usePhoneSession } from "./phone/usePhoneSession";

export { announce } from "@/lib/stoa/phone";

export default function Phone({ initialCode }: { initialCode?: string }) {
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState(normalizeCode(initialCode ?? ""));
  const [names, setNames] = useState<string[]>([]);
  const [back, setBack] = useState<Seat | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow(250);
  const p = usePhoneSession(initialCode);
  const { seat, snap, status, verified, step, error } = p;
  const { stage, mix, setMix, ready: soundReady, unlock } = useStage({ music: false, voice: false, sfx: true });
  usePhoneCues(snap, now, p.bag, stage);
  const a = usePhoneActions({ p, code, setNames, setBack, setBusy, lock: () => stage.sfx("lock") });

  useEffect(() => {
    setNames(nicknameChoices(Math.random));
    setBack(initialCode ? findSeat(seatStore(), normalizeCode(initialCode), Date.now()) : null);
    setReady(true);
  }, []);

  const entry = () => {
    if (back && step === "name") return <BackCard back={back} onResume={() => a.resume(back)} onFresh={() => a.fresh(back)} />;
    if (step === "code") return <CodeCard code={code} setCode={setCode} onSubmit={a.submitCode} />;
    return <NameCard code={code} names={names} setNames={setNames} busy={busy} onJoin={(n) => void a.join(n)} onChangeCode={() => p.setStep("code")} />;
  };
  const body = !ready ? null : !seat ? entry() : !snap ? <p className={styles.muted}>Connecting to the room.</p> : <PhoneLive snap={snap} now={now} offset={p.bag.offset} onNote={(i) => stage.note(i)} onAnswer={(i) => void a.answer(i)} />;

  return (
    <div className={`${styles.page} ${styles.playSkin}`} onClick={unlock} onTouchEnd={unlock}>
      <JoinStickers />
      <header className={styles.bar}>
        <Brand link={false} />
        {seat ? <MixBar mix={mix} setMix={setMix} ready={soundReady} unlock={unlock} full={false} /> : null}
        {seat ? <span className={styles.stat} data-testid="phone-status" data-socket={status} data-verified={verified}>{status === "open" ? "Live" : "Reconnecting"}</span> : null}
      </header>
      <main className={`${styles.main} ${styles.phone} ${styles.playSheet}`} data-testid="phone">
        {body}
        {seat ? (
          <Button variant="ghost" size="md" onClick={() => p.leave()} data-testid="leave">Leave game</Button>
        ) : null}
        {error ? <p role="alert" className={styles.error} data-testid="phone-error">{error}</p> : null}
      </main>
    </div>
  );
}
