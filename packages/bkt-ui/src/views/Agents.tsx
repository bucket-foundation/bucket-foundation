import { useEffect, useState } from "react";
import type { AgentRow, AgentsBody, Api } from "../api";

export const POLL_MS = 3000;
export const HEARTBEAT_MS = 2000;
export const CONSENT = "Bucket adds hooks to Claude Code and Codex. Each hook writes the session id, the event name and the project folder name to a file on this computer, then shows a notification while your agents run. No prompt text, transcript or full path leaves the hook.";

type AgentsApi = Pick<Api, "agents" | "reportFocus" | "setWait">;

const STATE_LABEL: Record<AgentRow["state"], string> = { running: "running", waiting: "waiting on you", done: "done" };

export function elapsed(fromS: number, nowMs: number): string {
  const s = Math.max(0, Math.floor(nowMs / 1000) - fromS);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export function useFocusReport(api: Pick<Api, "reportFocus">, doc: Document = document, win: Window = window): void {
  useEffect(() => {
    const send = () => {
      api.reportFocus(doc.hasFocus(), doc.visibilityState === "visible").catch(() => undefined);
    };
    send();
    const beat = win.setInterval(() => {
      if (doc.hasFocus()) send();
    }, HEARTBEAT_MS);
    win.addEventListener("focus", send);
    win.addEventListener("blur", send);
    doc.addEventListener("visibilitychange", send);
    return () => {
      win.clearInterval(beat);
      win.removeEventListener("focus", send);
      win.removeEventListener("blur", send);
      doc.removeEventListener("visibilitychange", send);
      api.reportFocus(false, doc.visibilityState === "visible").catch(() => undefined);
    };
  }, [api, doc, win]);
}

export function AgentsStrip({ api, now = Date.now }: { api: AgentsApi; now?: () => number }) {
  const [body, setBody] = useState<AgentsBody | null>(null);
  const [asking, setAsking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  useFocusReport(api);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = () => {
      api.agents().then(
        (b) => live && setBody(b),
        () => live && setBody(null),
      );
    };
    const start = () => {
      if (timer === undefined && document.visibilityState === "visible") {
        load();
        timer = setInterval(load, POLL_MS);
      }
    };
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const onVisible = () => (document.visibilityState === "visible" ? start() : stop());
    start();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [api]);

  if (!body || !body.supported) return null;

  const turnOn = async () => {
    try {
      const r = await api.setWait(true);
      setBody(r);
      setStatus(r.ok ? "Turned on. Your next prompt shows up here." : r.lines.join(" "));
    } catch {
      setStatus("Bucket could not add the hooks.");
    }
    setAsking(false);
  };

  return (
    <section className="agents" aria-label="Your agents">
      <h2>Your agents</h2>
      {!body.installed && !asking && (
        <p className="muted small">
          Study while Claude Code or Codex works. <button onClick={() => setAsking(true)}>Turn on</button>
        </p>
      )}
      {asking && (
        <div className="agents-consent">
          <p className="small">{CONSENT}</p>
          <button onClick={turnOn}>Turn on</button> <button onClick={() => setAsking(false)}>Cancel</button>
        </div>
      )}
      {status && <p className="status small">{status}</p>}
      {body.installed && body.sessions.length === 0 && <p className="muted small">No agent is running.</p>}
      {body.sessions.length > 0 && (
        <ul className="agents-list">
          {body.sessions.map((r) => (
            <li key={`${r.tool}:${r.session}`} className={`agent agent-${r.state}`}>
              <span className="agent-project">{r.project || r.session.slice(0, 8)}</span>
              <span className="muted small">{r.tool === "claude" ? "Claude" : "Codex"}</span>
              <b className="pill">{STATE_LABEL[r.state]}</b>
              <span className="muted small">{elapsed(r.since, now())}</span>
              {r.subagents > 0 && <span className="muted small">{r.subagents} {r.subagents === 1 ? "subagent" : "subagents"}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
