import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api } from "./api";
import { firstRunHash, followRoutes, href, useRoute } from "./router";
import { FOOT_LINK, navFor, Screen } from "./nav";

import { WORK_QUIZ_CHANGED } from "./views/WorkQuiz";
import "katex/dist/katex.min.css";
import "./app.css";

function App() {
  const route = useRoute();
  const [api, setApi] = useState<Api | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [workReady, setWorkReady] = useState(false);

  useEffect(() => {
    Api.connect((e) => setWarn(e.message))
      .then(async (a) => {
        const next = await a.decks().then((d) => firstRunHash(window.location.hash, d), () => null);
        if (next) window.location.hash = next;
        setApi(a);
      })
      .catch((e: Error) => setFatal(e.message));
  }, []);

  useEffect(() => {
    if (!api) return;
    const check = () => void api.workStatus().then((s) => setWorkReady(s.ready), () => setWorkReady(false));
    check();
    window.addEventListener(WORK_QUIZ_CHANGED, check);
    return () => window.removeEventListener(WORK_QUIZ_CHANGED, check);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    let live = true;
    void followRoutes(() => api.windowRoute(), (to) => (window.location.hash = to), () => live);
    return () => {
      live = false;
    };
  }, [api]);

  useEffect(() => {
    const flush = () => void api?.progress.flush();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [api]);

  const active = route.name === "node" ? "graph" : route.name === "deck" ? "learn" : route.name === "daily" ? "work" : route.name === "search" ? "canon" : route.name;
  const canon = route.name === "canon" || route.name === "search" || route.name === "explore";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="mark" aria-hidden />
          <span>Bucket</span>
        </div>
        <nav>
          {navFor(workReady).map((n) => (
            <a key={n.label} href={href(n.route)} className={active === n.route.name ? "on" : ""}>
              {n.label}
            </a>
          ))}
        </nav>
        <a className={route.name === FOOT_LINK.route.name ? "foot-link on" : "foot-link"} href={href(FOOT_LINK.route)}>
          {FOOT_LINK.label}
        </a>
        <p className="foot">Offline on this computer</p>
      </aside>
      <main className={canon ? "main wide" : "main"}>
        {warn && (
          <div className="banner" role="status">
            {warn}
            <button onClick={() => setWarn(null)}>Dismiss</button>
          </div>
        )}
        {fatal ? (
          <div className="panel empty">
            <h1>Bucket is locked</h1>
            <p>{fatal}</p>
          </div>
        ) : !api ? (
          <p className="muted">Opening…</p>
        ) : (
          <Screen api={api} route={route} />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
