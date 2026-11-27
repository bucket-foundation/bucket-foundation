"use client";

import { useState } from "react";
import { LobbyError, lobbyError, type LobbyApi, type WebLobbyState } from "@/lib/lobby/client";
import { roomControls } from "@/lib/lobby/room";
import { draftChanged, draftOf, settingsBody, type SettingsDraft } from "@/lib/lobby/waiting";
import { Button } from "@/ui";
import { setupValid, type GameId } from "../langs";
import { SetupFields, type SetupState } from "../lobbies/SetupFields";
import wait from "./waiting.module.css";

type Take = (l: WebLobbyState, sentAt: number) => void;

export function HostSettings({ lobby, api, take }: { lobby: WebLobbyState; api: LobbyApi; take: Take }) {
  const [open, setOpen] = useState(false);
  if (!roomControls(lobby).settings) return null;
  if (open) return <SettingsEditor lobby={lobby} api={api} take={take} close={() => setOpen(false)} />;
  return (
    <Button variant="ghost" size="md" onClick={() => setOpen(true)} data-testid="host-settings">
      Change games
    </Button>
  );
}

function setupState(draft: SettingsDraft, setDraft: (f: (d: SettingsDraft) => SettingsDraft) => void): SetupState {
  return {
    mode: draft.mode,
    setMode: (mode) => setDraft((d) => ({ ...d, mode, games: mode === "sequence" && d.games.length === 0 ? [d.game] : d.games })),
    game: draft.game as GameId,
    setGame: (game) => setDraft((d) => ({ ...d, game })),
    games: draft.games as GameId[],
    setGames: (next) => setDraft((d) => ({ ...d, games: typeof next === "function" ? next(d.games as GameId[]) : next })),
    langs: draft.langs,
    setLangs: (next) => setDraft((d) => ({ ...d, langs: typeof next === "function" ? next(d.langs) : next })),
    offered: null,
  };
}

function SettingsEditor({ lobby, api, take, close }: { lobby: WebLobbyState; api: LobbyApi; take: Take; close: () => void }) {
  const [draft, setDraft] = useState<SettingsDraft>(() => draftOf(lobby));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const invalid = setupValid(draft.mode, draft.mode === "single" ? [draft.game] : draft.games, draft.langs);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    try {
      const sentAt = Date.now();
      take(await api.settings(lobby.id, settingsBody(draft)), sentAt);
      close();
    } catch (err) {
      setError(lobbyError(err instanceof LobbyError ? err.code : undefined));
      setBusy(false);
    }
  };

  return (
    <section className={wait.settings} aria-label="Game settings" data-testid="host-settings-panel">
      <SetupFields s={setupState(draft, setDraft)} compact />
      {error ? <p className={wait.error} role="alert">{error}</p> : null}
      <div className={wait.row}>
        <Button onClick={() => void save()} disabled={busy || !draftChanged(draft, lobby)} data-testid="host-settings-save">
          Save for everyone
        </Button>
        <Button variant="quiet" size="sm" onClick={close}>Cancel</Button>
      </div>
    </section>
  );
}
