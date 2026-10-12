import type { Api } from "./api";
import type { Route } from "./router";
import { AddView } from "./views/Add";
import { AdvisorsView } from "./views/Advisors";
import { AtlasesView } from "./views/Atlases";
import { CanonSearchView } from "./views/CanonSearch";
import { DataView } from "./views/Data";
import { DeckView } from "./views/Deck";
import { ExploreView } from "./views/Explore";
import { HistoryView } from "./views/History";
import { ImportView } from "./views/Import";
import { JobsView } from "./views/Jobs";
import { LearnHome } from "./views/LearnHome";
import { LibraryView } from "./views/Library";
import { NotesView } from "./views/Notes";
import { PathView } from "./views/Path";
import { PrimesView } from "./views/Primes";
import { QuizView } from "./views/Quiz";
import { ResearchView } from "./views/Research";
import { ReviewView } from "./views/Review";
import { RosMapView } from "./views/RosMap";
import { RosNodeView } from "./views/RosNode";
import { RosProfileView } from "./views/RosProfile";
import { RosProgressView } from "./views/RosProgress";
import { SettingsView } from "./views/Settings";
import { DailyQuizView, WorkQuizView } from "./views/WorkQuiz";
import { WordConceptsView, WordDeckView, WordLessonView, WordLicenceView } from "./views/Words";

export const NAV: { route: Route; label: string }[] = [
  { route: { name: "learn" }, label: "Learn" },
  { route: { name: "path" }, label: "Path" },
  { route: { name: "quiz" }, label: "Quiz" },
  { route: { name: "review" }, label: "Review" },
  { route: { name: "work" }, label: "Work quiz" },
  { route: { name: "graph" }, label: "Graph" },
  { route: { name: "progress" }, label: "Progress" },
  { route: { name: "canon" }, label: "Canon" },
  { route: { name: "explore" }, label: "Explore" },
  { route: { name: "notes" }, label: "Notes" },
  { route: { name: "history" }, label: "History" },
  { route: { name: "jobs" }, label: "Analyze data" },
  { route: { name: "data" }, label: "Data" },
  { route: { name: "research" }, label: "Research" },
  { route: { name: "profile" }, label: "Profile" },
];

export const FOOT_LINK: { route: Route; label: string } = { route: { name: "add" }, label: "Add your own" };
export const SETTINGS_LINK: { route: Route; label: string } = { route: { name: "settings" }, label: "Settings" };
export const FOOT_LINKS = [FOOT_LINK, SETTINGS_LINK];

export function navFor(workReady: boolean) {
  return NAV.filter((n) => n.route.name !== "work" || workReady);
}

export function Screen({ api, route }: { api: Api; route: Route }) {
  if (route.name === "deck") return <DeckView key={`${route.deck}/${route.atom ?? ""}`} api={api} deck={route.deck} focus={route.atom} />;
  if (route.name === "words" && route.lesson) return <WordLessonView key={`${route.deck}/${route.lesson}`} api={api} deck={route.deck} n={route.lesson} />;
  if (route.name === "words") return <WordDeckView key={route.deck} api={api} deck={route.deck} />;
  if (route.name === "licence") return <WordLicenceView api={api} />;
  if (route.name === "concepts") return <WordConceptsView key={route.page ?? 1} api={api} page={route.page ?? 1} />;
  if (route.name === "path") return <PathView api={api} to={route.to} />;
  if (route.name === "quiz") return <QuizView api={api} />;
  if (route.name === "review") return <ReviewView api={api} />;
  if (route.name === "advisors") return <AdvisorsView api={api} />;
  if (route.name === "primes") return <PrimesView api={api} />;
  if (route.name === "history") return <HistoryView api={api} />;
  if (route.name === "notes") return <NotesView api={api} />;
  if (route.name === "atlases") return <AtlasesView api={api} />;
  if (route.name === "canon") return <CanonSearchView api={api} page="globe" find={route.find} />;
  if (route.name === "search") return <CanonSearchView api={api} page="search" id={route.id} />;
  if (route.name === "explore") return <ExploreView api={api} initial={{ data: route.data, mode: route.mode, sel: route.sel }} />;
  if (route.name === "daily") return <DailyQuizView key={route.day} api={api} day={route.day} />;
  if (route.name === "work") return <WorkQuizView api={api} />;
  if (route.name === "jobs") return <JobsView api={api} />;
  if (route.name === "data") return <DataView api={api} />;
  if (route.name === "research") return <ResearchView key={route.slug ?? ""} api={api} slug={route.slug} tab={route.tab ?? "report"} />;
  if (route.name === "import") return <ImportView api={api} />;
  if (route.name === "add") return <AddView />;
  if (route.name === "settings") return <SettingsView api={api} />;
  if (route.name === "library") return <LibraryView api={api} />;
  if (route.name === "graph") return <RosMapView branch={route.branch} />;
  if (route.name === "node") return <RosNodeView key={route.slug} slug={route.slug} />;
  if (route.name === "progress") return <RosProgressView />;
  if (route.name === "profile") return <RosProfileView />;
  return <LearnHome api={api} />;
}
