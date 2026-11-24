"use client";

import type { WebLobbyState } from "@/lib/lobby/client";
import { Button } from "@/ui";
import app from "../app/app.module.css";
import { gameName } from "./langs";
import { LangCard } from "./LearnWord";
import styles from "./play.module.css";
import world from "./world.module.css";

export function RoomChat({ lobby, chat, setChat, onSend }: { lobby: WebLobbyState; chat: string; setChat: (v: string) => void; onSend: (body: string) => void }) {
  return (
    <section className={styles.chat} aria-label="Chat">
      <ul className={styles.messages} data-testid="messages">
        {lobby.messages.map((m) => (
          <li key={m.id}>
            <b>{m.name}</b>
            {lobby.players.some((p) => p.userId === m.from && p.bot) ? <span className={styles.tag}> bot</span> : null} {m.body}
          </li>
        ))}
      </ul>
      <form
        className={styles.chatForm}
        onSubmit={(e) => {
          e.preventDefault();
          const body = chat.trim();
          if (!body) return;
          setChat("");
          onSend(body);
        }}
      >
        <input value={chat} onChange={(e) => setChat(e.target.value)} maxLength={200} placeholder="Say hi" aria-label="Message" data-testid="chat-input" />
        <Button type="submit" variant="ghost" size="md">Send</Button>
      </form>
    </section>
  );
}

export function RoomHeader({ lobby }: { lobby: WebLobbyState }) {
  return (
    <section className={`${app.stackSm} ${world.joinCard}`}>
      <div className={app.stackSm}>
        <p className={app.label}>{gameName(lobby.game)}</p>
        <p className={styles.langRow} data-testid="room-langs">
          {lobby.targets.map((l) => (
            <LangCard key={l} lang={l} />
          ))}
        </p>
        <p className={styles.code} data-testid="room-code">{lobby.code}</p>
      </div>
    </section>
  );
}
