"use client";

import { useState } from "react";
import { REACTIONS } from "@academy/lobbies";
import type { LobbyApi } from "@/lib/lobby/client";
import { Button } from "@/ui";
import styles from "../play.module.css";

export function ReactionBar({ api, lobbyId }: { api: LobbyApi; lobbyId: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const send = (emoji: string) => {
    setSent(emoji);
    void api.signal(lobbyId, { emoji }).catch(() => undefined);
    window.setTimeout(() => setSent((s) => (s === emoji ? null : s)), 600);
  };
  return (
    <div className={styles.reactions} role="group" aria-label="Send a reaction to the screen" data-testid="reactions">
      {REACTIONS.map((e) => (
        <Button bare key={e} className={styles.reaction} aria-pressed={sent === e} onClick={() => send(e)} data-testid={`react-${e}`}>
          {e}
        </Button>
      ))}
    </div>
  );
}
