"use client";

import { useEffect, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { syncDeps } from "@/lib/daily/browser-sync";
import { local } from "@/lib/storage";
import { joinFamily, rememberFamily, type SavedFamily } from "@/lib/family/group";
import { adoptGuestRooms } from "@/lib/family/results";
import { lastCard } from "@/lib/family/session";
import { Button, ButtonLink } from "@/ui";
import { useAccount } from "../../Account";
import { QuestCard, useFamilyQuest } from "../FamilyNight";
import f from "../family.module.css";

const ERRORS: Record<string, string> = {
  not_found: "That family link is not valid any more. Ask for a new one.",
  group_full: "That family is full.",
  joined_limit: "You are in too many groups already.",
  rate_limited: "Slow down a moment and try again.",
};

export default function FamilyJoin({ code }: { code: string }) {
  const { openSignIn } = useAccount();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [family, setFamily] = useState<SavedFamily | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const quest = useFamilyQuest(family);
  useEffect(() => {
    void appAuth().mobile.accessToken().catch(() => null).then((t) => setSignedIn(!!t));
  }, []);
  const join = async () => {
    setBusy(true);
    const t = await appAuth().mobile.accessToken().catch(() => null);
    if (!t) {
      setBusy(false);
      openSignIn();
      return;
    }
    const name = lastCard()?.nickname || "Family member";
    const res = await joinFamily(window.fetch.bind(window), t, code, name);
    setBusy(false);
    if (!res.family) return setError(ERRORS[res.error ?? ""] ?? "That did not work. Try again.");
    rememberFamily(local(), res.family);
    await adoptGuestRooms(local(), syncDeps());
    setFamily(res.family);
  };
  return (
    <div className={f.play} data-testid="family-join">
      <section className={f.card}>
        <p className={f.step}>Family invite</p>
        <h1 className={f.title}>{family ? `You are in ${family.name}` : "Join your family on Polingual"}</h1>
        {family ? null : (
          <>
            <p className={f.muted}>Your scores from tonight move into your account. Kids under 13 play as guests and are not added.</p>
            <div className={f.nav}>
              <Button size="lg" disabled={busy || signedIn === null} onClick={() => void join()} data-testid="family-join-button">{signedIn ? "Join the family" : "Sign in to join"}</Button>
            </div>
          </>
        )}
        {error ? <p className={f.muted} role="alert">{error}</p> : null}
        {quest ? <QuestCard quest={quest} /> : null}
        {family ? <ButtonLink size="lg" href="/play">Play a game</ButtonLink> : null}
      </section>
    </div>
  );
}
