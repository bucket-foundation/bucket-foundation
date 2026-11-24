"use client";

import { useEffect, useState } from "react";
import type { LobbyMessage } from "@academy/lobbies";
import { LobbyError, lobbyError, type LobbyApi } from "@/lib/lobby/client";
import { CHAT_REPORT_REASONS, readBlockCache, writeBlockCache, type ChatBlock } from "@/lib/lobby/moderation";
import { Button, Sheet } from "@/ui";
import app from "../app/app.module.css";

export type ChatSheet = { kind: "reasons" | "sent" | "block"; m: LobbyMessage } | null;

export function useChatModeration(api: LobbyApi, lobbyId: string, userId: string) {
  const [blocked, setBlockedState] = useState<ChatBlock[] | null>(null);
  const [blocksFailed, setBlocksFailed] = useState(false);
  const [sheet, setSheet] = useState<ChatSheet>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api.blocks().then(
      (b) => { if (live) { setBlockedState(b); writeBlockCache(userId, b); } },
      () => { if (live) { setBlockedState(readBlockCache(userId) ?? []); setBlocksFailed(true); } },
    );
    return () => { live = false; };
  }, [api, userId]);
  const setBlocked = (b: ChatBlock[]) => { setBlockedState(b); writeBlockCache(userId, b); };
  const open = (next: ChatSheet) => { setFailure(null); setSheet(next); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setFailure(null);
    try {
      await fn();
    } catch (e) {
      setFailure(lobbyError(e instanceof LobbyError ? e.code : undefined));
    } finally {
      setBusy(false);
    }
  };
  return { api, lobbyId, blocked, blocksFailed, setBlocked, sheet, setSheet, busy, failure, open, run };
}

export function ChatSheetPanel({ mod }: { mod: ReturnType<typeof useChatModeration> }) {
  const s = mod.sheet;
  if (!s) return null;
  return (
    <Sheet className={app.stackSm} role="dialog" aria-label={s.kind === "block" ? `Block ${s.m.name}?` : `Report ${s.m.name}?`} data-testid="chat-sheet">
      {s.kind === "reasons" ? (
        <>
          <p className={app.label}>Report {s.m.name}?</p>
          {CHAT_REPORT_REASONS.map((r) => (
            <Button key={r.id} variant="ghost" size="md" block disabled={mod.busy} onClick={() => void mod.run(async () => { await mod.api.report(mod.lobbyId, s.m.id, r.id); mod.setSheet({ kind: "sent", m: s.m }); })}>{r.label}</Button>
          ))}
          <Button variant="quiet" size="sm" onClick={() => mod.open(null)}>Cancel</Button>
        </>
      ) : s.kind === "sent" ? (
        <>
          <p className={app.label}>Report sent</p>
          <p className={app.small}>We will review this report and act on it.</p>
          <div className={app.row}>
            <Button variant="ghost" size="md" onClick={() => mod.open({ kind: "block", m: s.m })}>Block {s.m.name}</Button>
            <Button variant="quiet" size="sm" onClick={() => mod.open(null)}>Done</Button>
          </div>
        </>
      ) : (
        <>
          <p className={app.label}>Block {s.m.name}?</p>
          <p className={app.small}>You will stop seeing their messages.</p>
          <div className={app.row}>
            <Button variant="primary" size="md" disabled={mod.busy} onClick={() => void mod.run(async () => { mod.setBlocked(await mod.api.block(s.m.from, s.m.name, true)); mod.setSheet(null); })} data-testid="chat-block-confirm">Block</Button>
            <Button variant="quiet" size="sm" onClick={() => mod.open(null)}>Cancel</Button>
          </div>
        </>
      )}
      {mod.failure ? <p className={app.error} role="alert" data-testid="chat-sheet-error">{s.kind === "block" ? `Block failed: ${mod.failure}` : `Report not sent: ${mod.failure}`}</p> : null}
    </Sheet>
  );
}
