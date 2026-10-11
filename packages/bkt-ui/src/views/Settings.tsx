import { useEffect, useState } from "react";
import type { Api, AppSettings } from "../api";
import { WorkQuizSources } from "./WorkQuiz";

export const NOTIFY_UNSUPPORTED = "The daily notification runs on Linux for now.";

export function notifyLine(s: Pick<AppSettings, "notify" | "notifyDefault">): string {
  if (!s.notify.supported) return NOTIFY_UNSUPPORTED;
  if (!s.notify.on) return `Off. Type "bkt quiz schedule" in a terminal to turn it on at ${s.notifyDefault}.`;
  return `On${s.notify.at ? `, each day at ${s.notify.at}` : ""}. Type "bkt quiz schedule --at 07:30" in a terminal to move it, or "bkt quiz unschedule" to turn it off.`;
}

export function versionLine(s: Pick<AppSettings, "version" | "build">): string {
  return s.build ? `${s.version}, built from the work up to ${s.build.date}` : s.version;
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
      <article className="panel card">
        <h2>This app</h2>
        {error && <p className="error">{error}</p>}
        {settings && (
          <dl className="settings-rows">
            <dt>Daily notification</dt>
            <dd>{notifyLine(settings)}</dd>
            <dt>Data folder</dt>
            <dd className="path">{settings.dataDir}</dd>
            <dt>Version</dt>
            <dd>{versionLine(settings)}</dd>
          </dl>
        )}
      </article>
    </section>
  );
}
