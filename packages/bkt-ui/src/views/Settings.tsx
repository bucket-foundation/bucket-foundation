import { useEffect, useState } from "react";
import { ApiError, type Api, type AppSettings, type UpdateView } from "../api";
import { InstalledDecks, WordDatabaseLink } from "./Decks";
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

export const UPDATE_CHECK = "Check for updates";
export const UPDATE_CHECKING = "Checking for a newer release.";
export const UPDATE_INSTALLING = "Downloading and verifying the release.";
export const UPDATE_FAILED = "Bucket could not finish the update";

type UpdateApi = Pick<Api, "checkUpdate" | "installUpdate">;
type UpdateState =
  | { step: "idle" }
  | { step: "checking" }
  | { step: "view"; view: UpdateView }
  | { step: "installing"; view: UpdateView }
  | { step: "done"; message: string }
  | { step: "failed"; message: string };

const reason = (e: unknown) => (e instanceof ApiError && e.code ? e.code : e instanceof Error ? e.message : "");
const failed = (why: string) => (why ? `${UPDATE_FAILED}: ${why}` : `${UPDATE_FAILED}.`);

export function UpdatePanel({ api }: { api: UpdateApi }) {
  const [state, setState] = useState<UpdateState>({ step: "idle" });

  const check = async () => {
    setState({ step: "checking" });
    try {
      setState({ step: "view", view: await api.checkUpdate() });
    } catch (e) {
      setState({ step: "failed", message: failed(reason(e)) });
    }
  };
  const install = async (view: UpdateView) => {
    setState({ step: "installing", view });
    try {
      const o = await api.installUpdate();
      if (o.status === "installed") setState({ step: "done", message: `Bucket ${o.version} is installed. Quit Bucket and open it again to use it.` });
      else if (o.status === "current") setState({ step: "done", message: `Bucket ${o.version} is the latest release.` });
      else if (o.status === "manual") setState({ step: "done", message: o.instruction });
      else setState({ step: "failed", message: failed(o.error) });
    } catch (e) {
      setState({ step: "failed", message: failed(reason(e)) });
    }
  };
  const busy = state.step === "checking" || state.step === "installing";
  const view = state.step === "view" || state.step === "installing" ? state.view : null;
  const r = view?.result;

  return (
    <div className="update">
      <div className="toolbar">
        <button disabled={busy} onClick={() => void check()}>
          {UPDATE_CHECK}
        </button>
        {view && r?.status === "available" && view.selfUpdate && (
          <button className="primary" disabled={busy} onClick={() => void install(view)}>
            Update to {r.version}
          </button>
        )}
      </div>
      {state.step === "checking" && <p className="status">{UPDATE_CHECKING}</p>}
      {state.step === "installing" && <p className="status">{UPDATE_INSTALLING}</p>}
      {state.step === "view" && r?.status === "current" && <p className="status">Bucket {r.version} is the latest release.</p>}
      {state.step === "view" && r?.status === "available" && <p className="status">Bucket {r.version} is available. Its signature checks out.</p>}
      {state.step === "view" && r?.status === "available" && !state.view.selfUpdate && state.view.instruction && <p className="muted small">{state.view.instruction}</p>}
      {state.step === "view" && r?.status === "error" && <p className="error">The update check failed: {r.error}</p>}
      {state.step === "done" && <p className="status">{state.message}</p>}
      {state.step === "failed" && <p className="error">{state.message}</p>}
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
      <WordDatabaseLink api={api} />
      <article className="panel card">
        <h2>Agents</h2>
        <p>
          Run Claude Code, Codex or a Bucket chat on your own folders: <a href="#/agents">open Agents</a>. It joins the menu once an agent tool is installed or has run.
        </p>
      </article>
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
            <UpdatePanel api={api} />
          </>
        )}
      </article>
    </section>
  );
}
