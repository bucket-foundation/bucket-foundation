"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { clockOffset, type Snapshot } from "@/lib/stoa/client";
import { hostError, roomRequest, type HostRoom, type HostSettings } from "@/lib/stoa/host";

const KEY = "stoa/host/v1";

function load(): HostRoom | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HostRoom) : null;
  } catch {
    return null;
  }
}

function save(r: HostRoom | null): void {
  try {
    if (r) sessionStorage.setItem(KEY, JSON.stringify(r));
    else sessionStorage.removeItem(KEY);
  } catch {
  }
}

export function useHostRoom(setError: (e: string | null) => void, refresh: () => Promise<void>) {
  const [room, setRoom] = useState<HostRoom | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const offset = useRef(0);
  useEffect(() => setRoom(load()), []);

  const newRoom = useCallback(() => {
    save(null);
    setRoom(null);
    setSnap(null);
  }, []);

  const poll = useCallback(async () => {
    if (!room) return;
    const sent = Date.now();
    const r = await fetch(`/api/live/rooms/${room.room_id}/state`, { headers: { authorization: `Bearer ${room.host_token}` }, cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401 || r.status === 403 || r.status === 404) return newRoom();
    if (!r.ok) return;
    const body = (await r.json()) as Snapshot;
    offset.current = clockOffset(sent, Date.now(), body.server_now);
    setSnap(body);
  }, [room, newRoom]);

  useEffect(() => {
    if (!room) return;
    void poll();
    const t = setInterval(() => void poll(), 1000);
    return () => clearInterval(t);
  }, [room, poll]);

  const create = async (settings: HostSettings) => {
    setBusy(true);
    setError(null);
    try {
      const next = await openRoom(settings, setError, refresh);
      if (!next) return;
      save(next);
      setRoom(next);
    } catch {
      setError(hostError("offline"));
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: string, player?: string, body: Record<string, unknown> = {}) => {
    if (!room) return;
    const path = player ? `players/${player}/${action}` : action;
    await fetch(`/api/live/rooms/${room.room_id}/${path}`, { method: "POST", headers: { authorization: `Bearer ${room.host_token}`, "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    void poll();
  };

  return { room, snap, busy, offset, create, act, newRoom, download: () => download(room, setError) };
}

async function openRoom(settings: HostSettings, setError: (e: string) => void, refresh: () => Promise<void>): Promise<HostRoom | null> {
  const token = await appAuth().mobile.accessToken();
  const r = await fetch("/api/live/rooms", {
    method: "POST",
    headers: { authorization: `Bearer ${token ?? ""}`, "content-type": "application/json" },
    body: JSON.stringify(roomRequest(settings)),
  });
  const body = (await r.json()) as { error?: string; room_id: string; host_token: string; code: string };
  if (!r.ok) {
    setError(hostError(body.error));
    if (r.status === 401) void refresh();
    return null;
  }
  return { room_id: body.room_id, host_token: body.host_token, code: body.code };
}

async function download(room: HostRoom | null, setError: (e: string) => void) {
  if (!room) return;
  const r = await fetch(`/api/live/rooms/${room.room_id}/summary`, { headers: { authorization: `Bearer ${room.host_token}` }, cache: "no-store" }).catch(() => null);
  if (!r || !r.ok) return setError("The results did not download. Try again.");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `stoa-${room.code}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export type HostRoomState = ReturnType<typeof useHostRoom>;
