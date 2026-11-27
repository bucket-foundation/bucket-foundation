"use client";

import app from "../app/app.module.css";
import { useAccount } from "./Account";
import GameHub from "./GameHub";
import { Art } from "@/ui/art";
import { Button, Header } from "@/ui";
import { LobbySetup } from "./lobbies/LobbySetup";
import { OpenLobbies } from "./lobbies/OpenLobbies";
import { JoinBox } from "./lobbies/JoinBox";
import { useLobbies, type LobbiesState } from "./lobbies/useLobbies";

export default function Lobbies({ ispyReady = false }: { ispyReady?: boolean }) {
  const s = useLobbies();
  const { state, ready, error } = s;
  return (
    <div className={app.stack} data-testid="lobbies">
      <JoinBox s={s} />
      <Header
        eyebrow="Free to play"
        title="Play with friends"
        lede="Start a lobby, share the code, and play together from the app or a browser. No account needed."
        art={<>
          <span style={{ rotate: "-6deg" }}><Art name="ticket" size={130} shadow /></span>
          <span style={{ rotate: "8deg" }}><Art name="seal" size={74} shadow /></span>
        </>}
      />

      <GameHub open={s.open} ispyReady={ispyReady} offered={s.offered} onPick={s.pick} />

      {state.status === "loading" ? <p className={app.muted} aria-busy="true">Loading</p> : null}
      {state.status === "error" ? <p className={app.error} role="alert">{state.message}</p> : null}

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
