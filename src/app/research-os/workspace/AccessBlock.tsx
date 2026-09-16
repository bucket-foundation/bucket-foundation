"use client";

import { useCallback, useEffect, useState } from "react";

// The Access level on the selected node (ros-21): a visibility badge, the
// verbs the caller holds, a request control when a verb is missing on a
// shared or private node, and for the owner the visibility switch and the
// pending requests. Talks to /api/research-os/access.

type Visibility = "public" | "private" | "shared";
type Purpose = "continue" | "extend" | "cite" | "replicate" | "review";

interface AccessResponse {
  node: { id: string; visibility: Visibility; ownerId: string | null };
  isOwner: boolean;
  canView: boolean;
  verbs: Record<Purpose, boolean>;
  grants?: { id: string; granteeId: string | null; granteeGroup: string | null; role: string }[];
  requests?: { id: string; requesterId: string; purpose: Purpose; message: string | null; status: string }[];
  myRequests: { id: string; purpose: Purpose; status: string }[];
}

const PURPOSES: Purpose[] = ["continue", "extend", "cite", "replicate", "review"];
const LABEL: Record<Visibility, string> = { public: "public", private: "private", shared: "shared" };

export default function AccessBlock({ nodeId, token }: { nodeId: string; token: string | null }) {
  const [data, setData] = useState<AccessResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<Purpose>("cite");
  const [message, setMessage] = useState("");

  const headers = useCallback((): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/research-os/access?node=${encodeURIComponent(nodeId)}`, { headers: headers(), cache: "no-store" });
      if (!res.ok) {
        setData(null);
        return;
      }
      setData((await res.json()) as AccessResponse);
      setError(null);
    } catch {
      setData(null);
    }
  }, [nodeId, headers]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research-os/access", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers() },
        body: JSON.stringify({ nodeId, ...body }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `failed (${res.status})`);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  const missing = PURPOSES.filter((p) => !data.verbs[p]);
  const pendingMine = new Set(data.myRequests.filter((r) => r.status === "pending").map((r) => r.purpose));
  const canRequest = token && !data.isOwner && data.node.visibility !== "public" && missing.length > 0;

  return (
    <div className="mt-4 border-t border-[color:var(--hairline)] pt-3 text-[12px] text-[color:var(--basalt-2)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">access</span>
        <span className="px-2 py-0.5 rounded-full border border-[color:var(--hairline)] small-caps text-[10px] tracking-[0.14em]">
          {LABEL[data.node.visibility]}
        </span>
        {data.isOwner && <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--gold-deep)]">you own this node</span>}
        {!data.isOwner && data.node.visibility !== "public" && (
          <span className="text-[color:var(--basalt-3)]">
            you can {PURPOSES.filter((p) => data.verbs[p]).join(", ") || "view only"}
          </span>
        )}
      </div>

      {data.isOwner && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[color:var(--basalt-3)]">visibility</span>
          {(["public", "shared", "private"] as Visibility[]).map((v) => (
            <button
              key={v}
              type="button"
              disabled={busy || v === data.node.visibility}
              onClick={() => void post({ action: "set_visibility", visibility: v })}
              className={
                "px-2 py-0.5 rounded-full border small-caps text-[10px] tracking-[0.14em] " +
                (v === data.node.visibility
                  ? "bg-[color:var(--basalt)] text-[color:var(--bone)] border-[color:var(--basalt)]"
                  : "border-[color:var(--hairline)] hover:border-[color:var(--gold)]")
              }
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {data.isOwner && data.requests && data.requests.some((r) => r.status === "pending") && (
        <ul className="mt-2 grid gap-1">
          {data.requests
            .filter((r) => r.status === "pending")
            .map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span>
                  request to <b>{r.purpose}</b>
                  {r.message ? `: ${r.message}` : ""}
                </span>
                <button type="button" disabled={busy} onClick={() => void post({ action: "decide", requestId: r.id, decision: "granted" })} className="underline">
                  grant
                </button>
                <button type="button" disabled={busy} onClick={() => void post({ action: "decide", requestId: r.id, decision: "denied" })} className="underline">
                  deny
                </button>
              </li>
            ))}
        </ul>
      )}

      {canRequest && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[color:var(--basalt-3)]">ask the owner to</span>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)} className="bg-transparent border border-[color:var(--hairline)] rounded px-1 py-0.5 text-[12px]">
            {missing.map((p) => (
              <option key={p} value={p} disabled={pendingMine.has(p)}>
                {p}
                {pendingMine.has(p) ? " (pending)" : ""}
              </option>
            ))}
          </select>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="why"
            className="bg-transparent border border-[color:var(--hairline)] rounded px-2 py-0.5 text-[12px] min-w-[10rem]"
          />
          <button
            type="button"
            disabled={busy || pendingMine.has(purpose)}
            onClick={() => void post({ action: "request", purpose, message })}
            className="px-2 py-0.5 rounded-full border border-[color:var(--gold)] small-caps text-[10px] tracking-[0.14em] hover:bg-[color:var(--gold)] hover:text-[color:var(--basalt)]"
          >
            request
          </button>
        </div>
      )}
      {!token && data.node.visibility !== "public" && <p className="mt-1 text-[color:var(--basalt-3)]">Sign in to ask for access.</p>}
      {error && <p className="mt-1 text-[color:var(--crimson)]">{error}</p>}
    </div>
  );
}
