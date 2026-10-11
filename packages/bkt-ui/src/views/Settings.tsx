import { useEffect, useState } from "react";
import type { Api, AppSettings } from "../api";
import { InstalledDecks } from "./Decks";
import { WorkQuizSources } from "./WorkQuiz";

export const NOTIFY_UNSUPPORTED = "The daily notification is not available on this system yet.";
export const NOTIFY_NOTE = "Bucket tells you once a day when chats changed and a quiz is waiting.";
export const NOTIFY_FAILED = "Bucket could not change the daily notification.";
export const NOTIFY_LABEL = "Daily notification";
export const TIME_LABEL = "Time of day";

export function versionLine(s: Pick<AppSettings, "version" | "build">): string {
  return s.build ? `${s.version}, built from the work up to ${s.build.date}` : s.version;
}

type NotifyApi = Pick<Api, "setNotify">;

export function NotifySwitch({ api, notify, fallback }: { api: NotifyApi; notify: AppSettings["notify"]; fallback: string }) {
  const [state, setState] = useState(notify);
  const [time, setTime] = useState(notify.at ?? fallback);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!state.supported) return <p className="muted">{NOTIFY_UNSUPPORTED}</p>;

  const save = async (on: boolean, at: string) => {
    setBusy(true);
    try {
      const next = (await api.setNotify(on, on ? at : undefined)).notify;
      setState(next);
      if (next.at) setTime(next.at);
      setMsg(next.on ? `On, each day at ${next.at ?? at}.` : "Off.");
    } catch {
      setMsg(NOTIFY_FAILED);
    } finally {
      setBusy(false);
    }
  };
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  return (
    <div className="notify">
      <label className="row">
        <input type="checkbox" checked={state.on} disabled={busy || !valid} onChange={(e) => void save(e.target.checked, time)} /> {NOTIFY_LABEL}
      </label>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) void save(true, time);
        }}
      >
        <input type="time" aria-label={TIME_LABEL} value={time} disabled={busy} onChange={(e) => setTime(e.target.value)} />
        {state.on && valid && time !== state.at && (
          <button className="primary" disabled={busy}>
            Use this time
          </button>
        )}
      </form>
      <p className="muted small">{NOTIFY_NOTE}</p>
      {msg && <p className="status">{msg}</p>}
    </div>
  );
}

export function SettingsView({ api }: { api: Api }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.settings().then(
      (s) => live && setSettings(s),
      (e: Error) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [api]);

  return (
    <section>
      <header className="head">
        <h1>Settings</h1>
        <p className="muted">Everything here stays on this computer.</p>
      </header>
      <WorkQuizSources api={api} />
      <InstalledDecks api={api} />
      <article className="panel card">
        <h2>This app</h2>
        {error && <p className="error">{error}</p>}
        {settings && (
          <>
            <NotifySwitch api={api} notify={settings.notify} fallback={settings.notifyDefault} />
            <dl className="settings-rows">
              <dt>Data folder</dt>
              <dd className="path">{settings.dataDir}</dd>
              <dt>Version</dt>
              <dd>{versionLine(settings)}</dd>
            </dl>
          </>
        )}
      </article>
    </section>
  );
}
