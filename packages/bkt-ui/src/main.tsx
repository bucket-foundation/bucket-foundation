import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api } from "./api";
import { firstRunHash, href, useRoute, type Route } from "./router";
import { AdvisorsView } from "./views/Advisors";
import { DeckView } from "./views/Deck";
import { ImportView } from "./views/Import";
import { JobsView } from "./views/Jobs";
import { CanonSearchView } from "./views/CanonSearch";
import { AtlasesView } from "./views/Atlases";
import { NotesView } from "./views/Notes";
import { HistoryView } from "./views/History";
import { DailyQuizView, WORK_QUIZ_CHANGED, WorkQuizView } from "./views/WorkQuiz";
import { LearnHome } from "./views/LearnHome";
import { PrimesView } from "./views/Primes";
import { PathView } from "./views/Path";
import { QuizView } from "./views/Quiz";
import { ReviewView } from "./views/Review";
import "./app.css";

const NAV: { route: Route; label: string }[] = [
  { route: { name: "learn" }, label: "Learn" },
  { route: { name: "path" }, label: "Path" },
  { route: { name: "quiz" }, label: "Quiz" },
  { route: { name: "review" }, label: "Review" },
  { route: { name: "work" }, label: "Work quiz" },
  { route: { name: "canon" }, label: "Canon" },
  { route: { name: "atlases" }, label: "Atlases" },
  { route: { name: "advisors" }, label: "Advisors" },
  { route: { name: "primes" }, label: "Prime directions" },
  { route: { name: "notes" }, label: "Notes" },
  { route: { name: "history" }, label: "History" },
  { route: { name: "jobs" }, label: "Jobs" },
  { route: { name: "import" }, label: "Import" },
];

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
    const flush = () => void api?.progress.flush();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [api]);

  const active = route.name === "deck" ? "learn" : route.name === "daily" ? "work" : route.name === "search" ? "canon" : route.name;
  const canon = route.name === "canon" || route.name === "search";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="mark" aria-hidden />
          <span>Bucket</span>
        </div>
        <nav>
          {NAV.filter((n) => n.route.name !== "work" || workReady).map((n) => (
            <a key={n.label} href={href(n.route)} className={active === n.route.name ? "on" : ""}>
              {n.label}
            </a>
          ))}
        </nav>
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
        ) : route.name === "deck" ? (
          <DeckView key={`${route.deck}/${route.atom ?? ""}`} api={api} deck={route.deck} focus={route.atom} />
        ) : route.name === "path" ? (
          <PathView api={api} to={route.to} />
        ) : route.name === "quiz" ? (
          <QuizView api={api} />
        ) : route.name === "review" ? (
          <ReviewView api={api} />
        ) : route.name === "advisors" ? (
          <AdvisorsView api={api} />
        ) : route.name === "primes" ? (
          <PrimesView api={api} />
        ) : route.name === "history" ? (
          <HistoryView api={api} />
        ) : route.name === "notes" ? (
          <NotesView api={api} />
        ) : route.name === "atlases" ? (
          <AtlasesView api={api} />
        ) : route.name === "canon" ? (
          <CanonSearchView api={api} find={route.find} />
        ) : route.name === "search" ? (
          <CanonSearchView api={api} id={route.id} />
        ) : route.name === "daily" ? (
          <DailyQuizView key={route.day} api={api} day={route.day} />
        ) : route.name === "work" ? (
          <WorkQuizView api={api} />
        ) : route.name === "jobs" ? (
          <JobsView api={api} />
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
