"use client";

import { useCallback, useState } from "react";
import { phaseAt } from "@/lib/lobby/client";
import type { WorldId } from "@/ui/art/play";
import { ButtonLink } from "@/ui";
import app from "../app/app.module.css";
import GameWorld, { WorldStage } from "./GameWorld";
import Nickname from "./Nickname";
import RoomQr, { useJoinUrl } from "./RoomQr";
import { RoomHeader } from "./RoomParts";
import { savedNickname } from "./usePlay";
import world from "./world.module.css";
import styles from "./play.module.css";
import { gameName } from "./langs";
import { RoomSide } from "./room/RoomBits";
import { RoomResults } from "./room/RoomResults";
import { RoomReveal } from "./room/RoomReveal";
import { RoomRound } from "./room/RoomRound";
import { RoomWaiting } from "./room/RoomWaiting";
import { useRoomGame, type LiveRoom, type RoomGameState } from "./room/useRoomGame";

function RoomGame({ code: rawCode, onGame }: { code: string; onGame: (g: WorldId, code: string) => void }) {
  const g = useRoomGame(rawCode, onGame);
  if (!g.code) {
    return (
      <div className={app.stack}>
        <p className={app.error} role="alert">That code is not valid. Codes have 6 letters and numbers.</p>
        <ButtonLink variant="ghost" size="md" href="/play">Back to lobbies</ButtonLink>
      </div>
    );
  }
  if (!g.ready) return <RoomGate g={g} code={g.code} />;
  if (!g.lobby) return <RoomJoining code={g.code} error={g.error} />;
  return <RoomPhase g={g as LiveRoom} />;
}

function RoomGate({ g, code }: { g: RoomGameState; code: string }) {
  const { state } = g;
  return (
    <div className={app.stack} data-testid="room-gate">
      <p className={app.label}>Lobby {code}</p>
      <h2 className={app.title}>Pick a nickname to join</h2>
      {state.status === "error" ? <p className={app.error} role="alert">{state.message}</p> : null}
      {state.status === "loading" ? <p className={app.muted} aria-busy="true">Loading</p> : <Nickname initial={savedNickname()} onSubmit={(n) => void g.connect(n)} />}
    </div>
  );
}

function RoomJoining({ code, error }: { code: string; error: string | null }) {
  return (
    <div className={app.stack}>
      <p className={app.label}>Lobby {code}</p>
      {error ? (
        <>
          <p className={app.error} role="alert">{error}</p>
          <ButtonLink variant="ghost" size="md" href="/play">Back to lobbies</ButtonLink>
        </>
      ) : (
        <p className={app.muted} aria-busy="true">Joining</p>
      )}
    </div>
  );
}

function RoomPhase({ g }: { g: LiveRoom }) {
  const phase = phaseAt(g.lobby, g.now + g.offset);
  if (phase.kind === "waiting") return <RoomWaiting g={g} />;
  if (phase.kind === "countdown") {
    return (
      <div className={app.stack} data-testid="room">
        <RoomHeader lobby={g.lobby} />
        <WorldStage id={g.worldId}>
        <div className={styles.stage}>
          <div className={styles.arena}>
            <p className={styles.bigCount} key={Math.ceil(phase.seconds)} data-testid="countdown">{Math.ceil(phase.seconds)}</p>
            <p className={app.small}>{gameName(g.lobby.game)} · {g.lobby.rounds} rounds</p>
          </div>
          <RoomSide g={g} phase={phase} />
        </div>
        </WorldStage>
      </div>
    );
  }
  if (phase.kind === "reveal") return <RoomReveal g={g} phase={phase} />;
  if (phase.kind === "round") return <RoomRound g={g} phase={phase} />;
  return <RoomResults g={g} />;
}

export default function Room({ code }: { code: string }) {
  const [room, setRoom] = useState<{ game: WorldId; code: string | null }>({ game: "duel", code: null });
  const onGame = useCallback((game: WorldId, c: string) => setRoom((r) => (r.game === game && r.code === c ? r : { game, code: c })), []);
  return (
    <GameWorld id={room.game} aside={room.code ? <RoomBadge code={room.code} /> : null}>
      <RoomGame code={code} onGame={onGame} />
    </GameWorld>
  );
}

function RoomBadge({ code }: { code: string }) {
  const url = useJoinUrl(code);
  return (
    <div className={world.roomBadge} data-testid="room-badge">
      <span className={world.roomBadgeLabel}>{url ? `Join at ${url.replace(/^https?:\/\//, "").replace(/\/[^/]*$/, "")}` : "Join this room"}</span>
      <b className={world.roomBadgeCode}>{code}</b>
      <RoomQr code={code} />
    </div>
  );
}
