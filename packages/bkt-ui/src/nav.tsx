import type { Api } from "./api";
import type { Route } from "./router";
import { AdvisorsView } from "./views/Advisors";
import { AtlasesView } from "./views/Atlases";
import { CanonView } from "./views/Canon";
import { DeckView } from "./views/Deck";
import { HistoryView } from "./views/History";
import { ImportView } from "./views/Import";
import { JobsView } from "./views/Jobs";
import { LearnHome } from "./views/LearnHome";
import { NotesView } from "./views/Notes";
import { PathView } from "./views/Path";
import { PrimesView } from "./views/Primes";
import { QuizView } from "./views/Quiz";
import { ReviewView } from "./views/Review";
import { DailyQuizView, WorkQuizView } from "./views/WorkQuiz";

export const NAV: { route: Route; label: string }[] = [
  { route: { name: "learn" }, label: "Learn" },
  { route: { name: "path" }, label: "Path" },
  { route: { name: "quiz" }, label: "Quiz" },
  { route: { name: "review" }, label: "Review" },
  { route: { name: "work" }, label: "Work quiz" },
  { route: { name: "canon" }, label: "Canon" },
  { route: { name: "notes" }, label: "Notes" },
  { route: { name: "history" }, label: "History" },
  { route: { name: "jobs" }, label: "Jobs" },
  { route: { name: "import" }, label: "Import" },
];

export function Screen({ api, route }: { api: Api; route: Route }) {
  if (route.name === "deck") return <DeckView key={`${route.deck}/${route.atom ?? ""}`} api={api} deck={route.deck} focus={route.atom} />;
  if (route.name === "path") return <PathView api={api} to={route.to} />;
  if (route.name === "quiz") return <QuizView api={api} />;
  if (route.name === "review") return <ReviewView api={api} />;
  if (route.name === "advisors") return <AdvisorsView api={api} />;
  if (route.name === "primes") return <PrimesView api={api} />;
  if (route.name === "history") return <HistoryView api={api} />;
  if (route.name === "notes") return <NotesView api={api} />;
  if (route.name === "atlases") return <AtlasesView api={api} />;
  if (route.name === "canon") return <CanonView />;
  if (route.name === "daily") return <DailyQuizView key={route.day} api={api} day={route.day} />;
  if (route.name === "work") return <WorkQuizView api={api} />;
  if (route.name === "jobs") return <JobsView api={api} />;
  if (route.name === "import") return <ImportView api={api} />;
  return <LearnHome api={api} />;
}
