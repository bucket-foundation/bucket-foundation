"use client";

import app from "../app/app.module.css";
import { useAccount } from "./Account";
import Nickname from "./Nickname";
import GameHub from "./GameHub";
import { Art } from "@/ui/art";
import styles from "./play.module.css";
import { savedNickname } from "./usePlay";
import { Button } from "@/ui";
import { LobbySetup } from "./lobbies/LobbySetup";
import { OpenLobbies } from "./lobbies/OpenLobbies";
import { useLobbies, type LobbiesState } from "./lobbies/useLobbies";

export default function Lobbies({ ispyReady = false }: { ispyReady?: boolean }) {
  const s = useLobbies();
  const { state, ready, error } = s;
  return (
    <div className={app.stack} data-testid="lobbies">
      <section className={styles.hubHead}>
        <div className={app.stackSm}>
          <p className={app.label}>Free to play</p>
          <h1 className={app.title}>Play with friends</h1>
          <p className={app.muted}>Start a lobby, share the code, and play together from the app or a browser. No account needed.</p>
        </div>
        <div className={styles.hubArt} aria-hidden="true">
          <span style={{ rotate: "-6deg" }}><Art name="ticket" size={130} shadow /></span>
          <span style={{ rotate: "8deg" }}><Art name="seal" size={74} shadow /></span>
        </div>
      </section>

      <GameHub open={s.open} ispyReady={ispyReady} offered={s.offered} onPick={s.pick} />

      {state.status === "loading" ? <p className={app.muted} aria-busy="true">Loading</p> : null}
      {state.status === "error" ? <p className={app.error} role="alert">{state.message}</p> : null}
      {state.status === "needs-name" || state.status === "error" ? <div id="lobby-name"><Nickname initial={savedNickname()} onSubmit={(n) => void s.connect(n)} /></div> : null}

      {ready ? <ReadyLobbies s={s} /> : null}

      {error ? <p className={app.error} role="alert">{error}</p> : null}
    </div>
  );
}

function ReadyLobbies({ s }: { s: LobbiesState }) {
  const account = useAccount();
  const { state } = s;
  if (state.status !== "ready") return null;
  return (
    <>
      <form className={styles.nick} onSubmit={s.join}>
        <label className={app.field}>
          Join with a code
          <input value={s.code} onChange={(e) => s.setCode(e.target.value)} maxLength={8} autoCapitalize="characters" placeholder="ABC123" data-testid="join-code" />
        </label>
        <Button type="submit" variant="ghost" size="md" data-testid="join-go">Join</Button>
      </form>
      <LobbySetup s={s} />
      <OpenLobbies s={s} />
      <p className={app.small} data-testid="playing-as">
        Playing as {state.nickname}
        {state.identity.kind === "guest" ? (
          <>
            {" as a guest. "}
            <Button variant="quiet" size="sm" onClick={account.openSignIn} data-testid="lobby-sign-in">Sign in</Button> to save streaks and stats.
          </>
        ) : "."}
      </p>
    </>
  );
}
