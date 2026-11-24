"use client";

import type { LobbyApi, WebLobbyState } from "@/lib/lobby/client";
import { canModerate, visibleMessages } from "@/lib/lobby/moderation";
import { Button } from "@/ui";
import app from "../app/app.module.css";
import { ChatSheetPanel, useChatModeration } from "./ChatModeration";
import { gameName } from "./langs";
import { LangCard } from "./LearnWord";
import styles from "./play.module.css";
import world from "./world.module.css";

export function RoomChat({ lobby, api, chat, setChat, onSend }: { lobby: WebLobbyState; api: LobbyApi; chat: string; setChat: (v: string) => void; onSend: (body: string) => void }) {
  const myId = lobby.players.find((p) => p.isMe)?.userId;
  const mod = useChatModeration(api, lobby.id, myId ?? "");
  const bots = lobby.players.filter((p) => p.bot).map((p) => p.userId);
  return (
    <section className={styles.chat} aria-label="Chat">
      {mod.blocked ? null : <p className={app.small} data-testid="chat-loading">Loading chat…</p>}
      <ul className={styles.messages} data-testid="messages">
        {visibleMessages(lobby.messages, mod.blocked).map((m) => (
          <li key={m.id} className={styles.chatLine}>
            <span>
              <b>{m.name}</b>
              {lobby.players.some((p) => p.userId === m.from && p.bot) ? <span className={styles.tag}> bot</span> : null} {m.body}
            </span>
            {canModerate(m, myId, bots) ? (
              <span className={styles.chatActions}>
                <Button variant="quiet" size="sm" onClick={() => mod.open({ kind: "reasons", m })} data-testid="chat-report">Report</Button>
                <Button variant="quiet" size="sm" onClick={() => mod.open({ kind: "block", m })} data-testid="chat-block">Block</Button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {mod.blocksFailed ? <p className={app.small} data-testid="chat-blocks-notice">Your block list could not load. Using the copy saved on this device.</p> : null}
      <ChatSheetPanel mod={mod} />
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
