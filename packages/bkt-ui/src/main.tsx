import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api } from "./api";
import { href, useRoute, type Route } from "./router";
import { DeckView } from "./views/Deck";
import { ImportView } from "./views/Import";
import { LearnHome } from "./views/LearnHome";
import { QuizView } from "./views/Quiz";
import { ReviewView } from "./views/Review";
import "./app.css";

const NAV: { route: Route; label: string }[] = [
  { route: { name: "learn" }, label: "Learn" },
  { route: { name: "quiz" }, label: "Quiz" },
  { route: { name: "review" }, label: "Review" },
  { route: { name: "import" }, label: "Import" },
];

function App() {
  const route = useRoute();
  const [api, setApi] = useState<Api | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    Api.connect((e) => setWarn(e.message))
      .then(setApi)
      .catch((e: Error) => setFatal(e.message));
  }, []);

  useEffect(() => {
    const flush = () => void api?.progress.flush();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [api]);

  const active = route.name === "deck" ? "learn" : route.name;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="mark" aria-hidden />
          <span>Bucket</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <a key={n.label} href={href(n.route)} className={active === n.route.name ? "on" : ""}>
              {n.label}
            </a>
          ))}
        </nav>
        <p className="foot">Offline on this computer</p>
      </aside>
      <main className="main">
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
        ) : route.name === "deck" ? (
          <DeckView api={api} deck={route.deck} />
        ) : route.name === "quiz" ? (
          <QuizView api={api} />
        ) : route.name === "review" ? (
          <ReviewView api={api} />
        ) : route.name === "import" ? (
          <ImportView api={api} />
        ) : (
          <LearnHome api={api} />
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
