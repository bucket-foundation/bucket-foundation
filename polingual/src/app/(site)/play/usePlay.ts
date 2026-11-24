"use client";

import { local } from "@/lib/storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { browserGuestStore, cleanNickname, LobbyApi, LobbyError, lobbyError, resolveIdentity, type Identity } from "@/lib/lobby/client";

const NICK_KEY = "polingual-web/lobby-nick/v1";


export function savedNickname(): string {
  try {
    return local()?.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}

type PlayIdentity = { status: "loading" } | { status: "needs-name" } | { status: "ready"; identity: Identity; nickname: string } | { status: "error"; message: string };

export function usePlay() {
  const [state, setState] = useState<PlayIdentity>({ status: "loading" });
  const [token, setToken] = useState<string | null>(null);
  const api = useMemo(() => new LobbyApi({ fetch: (input, init) => window.fetch(input, init), auth: async () => token }), [token]);

  const connect = useCallback(async (nickname: string | null) => {
    const name = nickname ? cleanNickname(nickname) : null;
    const store = browserGuestStore(local);
    const bare = new LobbyApi({ fetch: (input, init) => window.fetch(input, init), auth: async () => null });
    try {
      const account = await appAuth().mobile.accessToken().catch(() => null);
      const merging = account ? new LobbyApi({ fetch: (input, init) => window.fetch(input, init), auth: async () => account }) : bare;
      if (!name) {
        setState({ status: "needs-name" });
        return;
      }
      const identity = await resolveIdentity({ api: { guest: (g, n) => bare.guest(g, n), merge: (t) => merging.merge(t) }, store, account: async () => account, now: () => Date.now() }, name);
      if (!identity) {
        setState({ status: "needs-name" });
        return;
      }
      local()?.setItem(NICK_KEY, name);
      setToken(identity.token);
      setState({ status: "ready", identity, nickname: name });
    } catch (err) {
      setState({ status: "error", message: lobbyError(err instanceof LobbyError ? err.code : undefined) });
    }
  }, []);

  useEffect(() => {
    void connect(savedNickname() || null);
  }, [connect]);

  return { state, api, connect };
}
