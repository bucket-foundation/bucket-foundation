"use client";

import { useEffect, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { local } from "@/lib/storage";
import { createFamily, familyHref, familyName, fetchQuest, readFamily, rememberFamily, type Quest, type SavedFamily } from "@/lib/family/group";
import { Button, ButtonLink } from "@/ui";
import Qr from "../../live/Qr";
import { useAccount } from "../Account";
import f from "./family.module.css";

const bound = () => window.fetch.bind(window);
const token = () => appAuth().mobile.accessToken().catch(() => null);

export function useFamilyQuest(family: SavedFamily | null): Quest | null {
  const [quest, setQuest] = useState<Quest | null>(null);
  useEffect(() => {
    if (!family) return;
    let live = true;
    void token().then((t) => (t ? fetchQuest(bound(), t, family.id) : null)).then((q) => live && setQuest(q));
    return () => {
      live = false;
    };
  }, [family]);
  return quest;
}

export function QuestCard({ quest }: { quest: Quest }) {
  return (
    <div className={f.map} data-testid="family-quest">
      <p className={f.step}>Family Quest: play five games together</p>
      <p className={f.title}>{quest.quest.done} of {quest.quest.goal} this week</p>
      <ol className={f.people}>
        {quest.board.map((p) => (
          <li key={p.name}><span className={f.who}>{p.name}</span> {p.xp} XP{p.me ? " · you" : ""}</li>
        ))}
      </ol>
    </div>
  );
}

export default function FamilyNight({ nickname, host }: { nickname: string; host: boolean }) {
  const { openSignIn } = useAccount();
  const [family, setFamily] = useState<SavedFamily | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => setFamily(readFamily(local())), []);
  const quest = useFamilyQuest(family);
  const make = async () => {
    setBusy(true);
    setError(false);
    const t = await token();
    if (!t) {
      setBusy(false);
      openSignIn();
      return;
    }
    const made = await createFamily(bound(), t, familyName(nickname), nickname);
    setBusy(false);
    if (!made) return setError(true);
    rememberFamily(local(), made);
    setFamily(made);
  };
  if (family) {
    const href = familyHref(family.code, window.location.origin);
    return (
      <section className={f.card} aria-label="Family" data-testid="family-night">
        <p className={f.step}>{family.name}</p>
        {quest ? <QuestCard quest={quest} /> : null}
        {host ? (
          <>
            <p className={f.muted}>Everyone scans to join the family. Your player cards come with you when you sign in.</p>
            <div className={f.qr}><Qr text={href} /></div>
            <ButtonLink variant="ghost" size="md" href={href} data-testid="family-link">Family invite link</ButtonLink>
          </>
        ) : null}
      </section>
    );
  }
  if (!host) return null;
  return (
    <section className={f.card} aria-label="Family" data-testid="family-night">
      <p className={f.step}>Make this our family</p>
      <p className={f.muted}>One link for everyone at the table. The family keeps a weekly quest and the TV remembers you next time.</p>
      <div className={f.nav}>
        <Button size="lg" disabled={busy} onClick={() => void make()} data-testid="family-make">Make this our family</Button>
        <ButtonLink variant="ghost" size="md" href="/pricing" data-testid="family-plan">See the Family plan</ButtonLink>
      </div>
      {error ? <p className={f.muted} role="alert">That did not work. Try again in a moment.</p> : null}
    </section>
  );
}
