import { createBktServeStore, type BktServeStore } from "@academy/bkt-serve-store";
import type { Atom } from "@academy/engine";
import type { CanonGraph } from "@/lib/canon-graph-core";
import type { AdvisorRow, PrimeDirections } from "@ros/advisor-review";
import { parseRos, ROS_PATHS, type RosPayloads, type RosResource } from "@ros/contract";
import type { ProductionsSnapshot } from "@ros/productions-snapshot";
import type { ConceptPage, LessonPage, WordCredit, WordLicence } from "../../bkt/src/core/words";
import type { WordDeckProgress, WordLessonProgress } from "../../bkt/src/words";
import { siteFetch } from "./site-fetch";

export type { ConceptPage, ConceptRow, LessonPage, LessonWord, WordCredit, WordLicence, WordView } from "../../bkt/src/core/words";
export type { WordDeckProgress, WordLessonProgress } from "../../bkt/src/words";
export type { DeckRow as InstalledDeckRow } from "../../bkt/src/decks";
export type { DecksBody } from "../../bkt/src/deck-routes";
export type { LinkHit, LinkMode, LinkSearch, LinkStatus } from "../../bkt/src/polingual-link";
import type { LinkMode, LinkSearch, LinkStatus } from "../../bkt/src/polingual-link";
export type { DeckState, LibraryBody, LibraryRow } from "../../bkt/src/library";
import type { LibraryBody } from "../../bkt/src/library";
export type { CreditWithDecks, DeckCredit, WordHit, WordSearch } from "../../bkt/src/core/word-decks";
import type { DecksBody } from "../../bkt/src/deck-routes";
import type { WordSearch } from "../../bkt/src/core/word-decks";
export type { ResearchDetail, ResearchRow } from "../../bkt/src/research";
export type { TablePage } from "../../bkt/src/research-table";
import type { TablePage } from "../../bkt/src/research-table";
export type { Change, Exported } from "../../bkt/src/research-work";
export type { WorkspaceItem } from "../../bkt/src/workspace";
export type { ShownRow as ReviewRow } from "../../bkt/src/alignment";
import type { ShownRow as ReviewRow } from "../../bkt/src/alignment";
import type { WorkspaceItem } from "../../bkt/src/workspace";
import type { Change, Exported } from "../../bkt/src/research-work";

export interface BuildWaiting {
  id: string;
  slug: string;
  build: string;
  class: "shipped" | "edited";
  digest: string;
  title: string;
  body: string;
  expiresAt: number;
}

export type BuildAsk = { state: "waiting"; pending: BuildWaiting } | { state: "refused"; reason: string; install: string | null; status: number };

export type SaveResult = { saved: true; rev: string; changed: boolean } | { saved: false; current: string };
export const EDIT_EXTS = [".md", ".tex", ".bib", ".sty", ".tsv", ".csv", ".json", ".jsonl", ".py", ".txt", ".lean"];
export const EDIT_BYTES = 4 * 1024 * 1024;
export type { PackedFile, ReportAsset, ReportAttribution, ReportRecord } from "../../bkt/src/pack/research";
import type { ResearchDetail, ResearchRow } from "../../bkt/src/research";

export type PaperPage = { state: "ready"; pages: number; pdf: string; src: string } | { state: "rendering" } | { state: "preview"; reason: string; install: string | null };

export const IMAGE_TYPES = ["image/png", "image/webp", "image/jpeg", "image/svg+xml"];
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export function researchFileUrl(slug: string, path: string): string {
  return `/local/research/file?slug=${encodeURIComponent(slug)}&path=${encodeURIComponent(path)}`;
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result));
    reader.onerror = () => fail(new Error("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}

export interface WordDecks {
  decks: WordDeckProgress[];
  chosen: string[];
  credit: WordCredit;
}

export interface WordLessons {
  deck: WordDeckProgress;
  lessons: WordLessonProgress[];
  credit: WordCredit;
}

export type WordQuizPick = { deck: string; lesson: number } | { concepts: number };
export type WordAnswerApi = Pick<Api, "wordQuiz" | "wordAnswer">;

export interface HistoryData {
  snapshot: (ProductionsSnapshot & { importedAt: number }) | null;
  activity: { day: string; learn: number; work: number; notes: number }[];
}

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkStatus {
  beads: number;
  prs: number;
  repo: string | null;
  repoError: string | null;
  chat?: { claude: boolean; codex: boolean };
  languages?: string[];
  ready: boolean;
  answered: number;
  correct: number;
}

export interface AppSettings {
  version: string;
  build: { commit: string; date: string } | null;
  dataDir: string;
  notify: { supported: boolean; on: boolean; at: string | null };
  notifyDefault: string;
}

export type UpdateCheck =
  | { status: "current"; version: string }
  | { status: "available"; version: string; tag: string; asset: string; sha256: string; url: string }
  | { status: "error"; error: string };

export interface UpdateView {
  current: string;
  kind: "binary" | "appimage" | "desktop" | "flatpak" | "package" | "source";
  selfUpdate: boolean;
  instruction: string | null;
  result: UpdateCheck;
}

export type UpdateOutcome =
  | { status: "installed"; version: string }
  | { status: "current"; version: string }
  | { status: "manual"; version: string | null; instruction: string }
  | { status: "error"; error: string };

export interface WorkWord {
  lang: string | null;
  choicesLang: string | null;
  credit: string;
  href: string | null;
}

export interface WorkQuestion {
  id: string;
  type: string;
  prompt: string;
  lines: string[];
  choices: string[] | null;
  limitSec: number;
  word?: WorkWord;
  origin?: string;
}

export interface WorkSource {
  kind: string;
  ref: string;
  label: string;
  href: string | null;
}

export interface WorkAnswer {
  correct: boolean;
  timedOut: boolean;
  answer: string;
  explain: string;
  sources?: WorkSource[];
  resource?: { label: string; href: string } | null;
}

export interface DailyQuiz {
  day: string;
  questions: WorkQuestion[];
  answered: string[];
}

export interface DailyAnswer extends WorkAnswer {
  log10Distance: number | null;
}

export const PROGRESS_TROUBLE = "Bucket could not reach your saved progress. Close this window and open Bucket again.";

export function plainError(status: number): string {
  if (status === 401 || status === 403) return "Bucket is locked. Close this window and open Bucket again.";
  if (status === 404) return "Bucket could not find that.";
  if (status === 409) return "Bucket already did that.";
  if (status === 413) return "That is too large for Bucket.";
  if (status >= 400 && status < 500) return "Bucket could not use that. Check it and try again.";
  return "Bucket ran into a problem. Try again.";
}

export interface CanonHit {
  claim_id: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  score: number;
  url: string;
  excerpt: string;
  evidence_count: number;
}

export interface CanonPassage {
  score: number;
  kind: string;
  source_path: string;
  text: string;
  url: string | null;
  title: string;
  author: string | null;
  openable: boolean;
}

export interface CanonExcerpt {
  id: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  text: string;
  source: { title: string; url: string | null; timestamp: string | null };
  evidence: CanonPassage[];
}

export interface CanonLicence {
  kind: string;
  name: string;
  terms: string;
  url: string | null;
  works: number;
}

export interface CanonAbout {
  version: string | null;
  excerpts: number;
  branches: string[];
  licences: CanonLicence[];
}

export interface DataCount {
  kind: string;
  label: string;
  n: number;
  stored?: "encrypted" | "partly" | "plain";
  screen?: string;
}

export interface DataPart {
  name: string;
  count: number;
  unit: string;
  terms: string | null;
  link: string | null;
  openable: boolean;
}

export interface Dataset {
  id: string;
  name: string;
  about: string;
  browsable: boolean;
  version: string | null;
  builtAt: number | null;
  checksum: string | null;
  counts: DataCount[];
  kinds: { id: string; label: string }[];
  parts: DataPart[];
  leftOut: { count: number; reason: string } | null;
}

export interface DataRow {
  id: string;
  title: string;
  creators: string | null;
  year: number | null;
  kind: string;
  kindLabel: string;
  source: string | null;
  openable: boolean;
}

export interface DataPage {
  total: number;
  offset: number;
  limit: number;
  records: DataRow[];
}

export interface DataQuery {
  q?: string;
  kind?: string;
  sort?: "title" | "creators" | "year" | "kind";
  dir?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

export interface DataDetail {
  record: DataRow;
  fields: { label: string; value: string }[];
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(plainError(status));
  }
}

export interface JobKind {
  kind: string;
  label: string;
  inputs: { name: string; label: string; exts: string[] }[];
}

export interface JobView {
  id: string;
  kind: string;
  state: "running" | "done" | "failed" | "cancelled" | "timeout";
  startedAt: number;
  endedAt: number | null;
  code: number | null;
  log: string;
  logTruncated: boolean;
  result: unknown;
  error: string | null;
  install?: string | null;
}

export interface StoredReview {
  key: string;
  prime_axes: string[];
  our_axes: string[];
  star_query_prime: number[];
  star_query_ours: number[];
  summary: string;
  imported_at: number;
  rows: AdvisorRow[];
}

declare global {
  interface Window {
    __BKT__?: { nonce?: string; offline?: boolean };
  }
}

export interface DeckRow {
  id: string;
  title: string;
  atoms: number;
  introduced: number;
  due: number;
  xp: number;
}

export interface QuizQuestion {
  itemId: string;
  prompt: string;
  choices: string[];
  limitSec: number;
}

export interface QuizResult {
  correct: boolean;
  timedOut: boolean;
  rating: number;
  answer: string;
  explain?: string | null;
  lesson?: { deck: string; atom: string; title: string } | null;
}

export interface ReviewItem {
  id: string;
  title: string;
  prompt: string;
  answer: string;
}

export class Api {
  readonly progress: BktServeStore;

  constructor(private token: string, onError: (e: Error) => void) {
    this.progress = createBktServeStore({ token, onError: () => onError(new Error(PROGRESS_TROUBLE)) });
  }

  static async connect(onError: (e: Error) => void): Promise<Api> {
    const nonce = window.__BKT__?.nonce;
    const offline = window.__BKT__?.offline === true;
    delete window.__BKT__;
    if (!nonce) throw new Error("This window has no launch code. Run bkt app to open Bucket.");
    const r = await fetch("/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
    if (!r.ok) throw new Error(`Bucket refused the launch code (${r.status}). Run bkt app to open Bucket again.`);
    const { token } = (await r.json()) as { token: string };
    window.fetch = siteFetch(window.fetch.bind(window), window.location.origin, token, offline);
    return new Api(token, onError);
  }

  private async call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const r = await fetch(path, {
      method: init.method ?? "GET",
      headers: { authorization: `Bucket ${this.token}`, ...(init.body === undefined ? {} : { "content-type": "application/json" }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const data = (await r.json().catch(() => ({}))) as T & { error?: string };
    if (!r.ok) throw new ApiError(data.error ?? "", r.status);
    return data;
  }

  windowRoute() {
    return this.call<{ route: string | null; superseded: boolean }>("/local/window/route");
  }

  decks() {
    return this.call<{ decks: DeckRow[] }>("/local/decks").then((r) => r.decks);
  }

  exportProgress() {
    return this.call<{ name: string; folder: string }>("/local/progress/export", { method: "POST", body: {} });
  }

  atoms(deck: string) {
    return this.call<{ atoms: Atom[] }>(`/local/atoms?deck=${encodeURIComponent(deck)}`).then((r) => r.atoms);
  }

  quiz(n = 10) {
    return this.call<{ questions: QuizQuestion[] }>(`/local/quiz?n=${n}`).then((r) => r.questions);
  }

  answer(itemId: string, choice: number | null, elapsedMs: number) {
    return this.call<QuizResult>("/local/quiz", { method: "POST", body: { itemId, choice, elapsedMs } });
  }

  due(n = 20) {
    return this.call<{ items: ReviewItem[] }>(`/local/review?n=${n}`).then((r) => r.items);
  }

  rate(itemId: string, rating: 1 | 2 | 3 | 4, elapsedMs: number) {
    return this.call<{ ok: boolean; due: number | null }>("/local/review", { method: "POST", body: { itemId, rating, elapsedMs } });
  }

  importWeb(payload: unknown, force = false) {
    return this.call<{ imported: string[] }>(`/local/import${force ? "?force=1" : ""}`, { method: "POST", body: payload });
  }

  advisor() {
    return this.call<{ review: StoredReview | null; forgotten: number }>("/local/advisor");
  }

  importAdvisor(file: unknown, force = false) {
    return this.call<{ imported: number; forgotten: number }>(`/local/advisor/import${force ? "?force=1" : ""}`, { method: "POST", body: file });
  }

  forgetAdvisor() {
    return this.call<{ forgotten: number }>("/local/advisor/forget", { method: "POST", body: {} });
  }

  primeDirections() {
    return this.call<{ sets: (PrimeDirections & { imported_at: number })[] }>("/local/prime-directions").then((r) => r.sets);
  }

  importPrimeDirections(file: unknown) {
    return this.call<{ corpus: string; components: number }>("/local/prime-directions/import", { method: "POST", body: file });
  }

  jobs() {
    return this.call<{ kinds: JobKind[]; jobs: JobView[] }>("/local/jobs");
  }

  startJob(kind: string, files: Record<string, { text: string; ext: string }>, options: Record<string, number> = {}) {
    return this.call<JobView>("/local/jobs", { method: "POST", body: { kind, files, options } });
  }

  cancelJob(id: string) {
    return this.call<JobView>("/local/jobs/cancel", { method: "POST", body: { id } });
  }

  deleteJob(id: string) {
    return this.call<{ deleted: string }>("/local/jobs/delete", { method: "POST", body: { id } });
  }

  settings() {
    return this.call<AppSettings>("/local/settings");
  }

  checkUpdate() {
    return this.call<UpdateView>("/local/update");
  }

  installUpdate() {
    return this.call<UpdateOutcome>("/local/update/install", { method: "POST", body: {} });
  }

  setNotify(on: boolean, at?: string) {
    return this.call<{ notify: AppSettings["notify"] }>("/local/settings/notify", { method: "POST", body: at === undefined ? { on } : { on, at } });
  }

  workStatus() {
    return this.call<WorkStatus>("/local/work-quiz/status");
  }

  workBeads(text: string) {
    return this.call<{ beads: number }>("/local/work-quiz/beads", { method: "POST", body: { text } });
  }

  workRepo(path: string | null) {
    return this.call<{ repo: string | null }>("/local/work-quiz/repo", { method: "POST", body: { path } });
  }

  workChat(chat: { claude: boolean; codex: boolean }) {
    return this.call<{ chat: { claude: boolean; codex: boolean } }>("/local/work-quiz/chat", { method: "POST", body: chat });
  }

  workLanguages() {
    return this.call<{ languages: string[]; available: { code: string; name: string }[] }>("/local/work-quiz/languages");
  }

  workSetLanguages(languages: string[]) {
    return this.call<{ languages: string[] }>("/local/work-quiz/languages", { method: "POST", body: { languages } });
  }

  researchList() {
    return this.call<{ outputs: ResearchRow[] }>("/local/research/list");
  }

  researchManifest(slug: string) {
    return this.call<ResearchDetail>(`/local/research/manifest?slug=${encodeURIComponent(slug)}`);
  }

  researchTable(slug: string, id: string, query: { page?: number; q?: string; sort?: string } = {}) {
    const params = new URLSearchParams({ slug, id, page: String(query.page ?? 1) });
    if (query.q) params.set("q", query.q);
    if (query.sort) params.set("sort", query.sort);
    return this.call<TablePage>(`/local/research/table?${params.toString()}`);
  }

  async researchPage(slug: string, n: number): Promise<PaperPage> {
    const r = await fetch(`/local/research/page?slug=${encodeURIComponent(slug)}&n=${n}`, { headers: { authorization: `Bucket ${this.token}` } });
    if (r.status === 202 || r.status === 409) {
      const body = (await r.json().catch(() => ({}))) as { state?: string; reason?: string; install?: string | null; error?: string };
      if (body.state === "rendering") return { state: "rendering" };
      if (body.state === "preview" || body.state === "failed") return { state: "preview", reason: body.reason ?? "", install: body.install ?? null };
      throw new ApiError(body.error ?? "", r.status);
    }
    if (!r.ok) throw new ApiError(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "", r.status);
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim();
    const pages = Number(r.headers.get("x-bkt-pages") ?? "0");
    const blob = await r.blob();
    if (type !== "image/png" || !Number.isInteger(pages) || pages < 1) throw new Error("The page did not arrive as an image.");
    if (blob.size > IMAGE_MAX_BYTES) throw new Error("That page is over 8 MB.");
    return { state: "ready", pages, pdf: r.headers.get("x-bkt-pdf") ?? "", src: await asDataUrl(blob.type === type ? blob : new Blob([blob], { type })) };
  }

  async researchBuild(slug: string, build: string): Promise<BuildAsk> {
    const r = await fetch(`/local/research/build?slug=${encodeURIComponent(slug)}&build=${encodeURIComponent(build)}`, { method: "POST", headers: { authorization: `Bucket ${this.token}`, "content-type": "application/json" }, body: "{}" });
    const body = (await r.json().catch(() => ({}))) as BuildWaiting & { error?: string; install?: string | null };
    if (r.status === 202) return { state: "waiting", pending: body };
    if (r.status === 401) throw new ApiError(body.error ?? "", r.status);
    return { state: "refused", reason: body.error ?? "", install: body.install ?? null, status: r.status };
  }

  researchBuildState() {
    return this.call<{ pending: BuildWaiting | null; job: JobView | null }>("/local/research/consent/pending");
  }

  researchBuildCancel(id: string) {
    return this.call<JobView>("/local/research/job/cancel", { method: "POST", body: { id } });
  }

  researchNew(input: { title: string; slug: string; kind: string }) {
    return this.call<{ slug: string }>("/local/research/new", { method: "POST", body: input });
  }

  async researchUpload(slug: string, role: string, name: string, file: Blob): Promise<{ slug: string; path: string }> {
    const r = await fetch(`/local/research/upload?slug=${encodeURIComponent(slug)}&role=${encodeURIComponent(role)}&name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { authorization: `Bucket ${this.token}`, "content-type": "application/octet-stream" },
      body: file,
    });
    const body = (await r.json().catch(() => ({}))) as { slug?: string; path?: string; error?: string };
    if (!r.ok || typeof body.path !== "string") throw new ApiError(body.error ?? "", r.status);
    return { slug: body.slug ?? slug, path: body.path };
  }

  researchChanges(slug: string) {
    return this.call<{ notice: string; changes: Change[] }>(`/local/research/changes?slug=${encodeURIComponent(slug)}`);
  }

  async researchSource(slug: string, path: string): Promise<{ text: string; rev: string }> {
    const r = await this.researchFile(slug, path);
    return { text: await r.text(), rev: r.headers.get("x-bkt-sha256") ?? "" };
  }

  async researchSave(slug: string, path: string, baseRev: string, text: string): Promise<SaveResult> {
    const r = await fetch(`/local/research/file?slug=${encodeURIComponent(slug)}&path=${encodeURIComponent(path)}&base_rev=${encodeURIComponent(baseRev)}`, {
      method: "POST",
      headers: { authorization: `Bucket ${this.token}`, "content-type": "text/plain; charset=utf-8" },
      body: text,
    });
    const body = (await r.json().catch(() => ({}))) as { rev?: string; changed?: boolean; current?: string; error?: string };
    if (r.status === 409 && typeof body.current === "string") return { saved: false, current: body.current };
    if (!r.ok || typeof body.rev !== "string") throw new ApiError(body.error ?? "", r.status);
    return { saved: true, rev: body.rev, changed: body.changed === true };
  }

  researchRevert(slug: string, path: string, keep = false) {
    return this.call<{ path: string; changed: number }>("/local/research/revert", { method: "POST", body: { slug, path, keep } });
  }

  researchExport(slug: string) {
    return this.call<Exported>("/local/research/export", { method: "POST", body: { slug } });
  }

  alignmentRows(ids: string[]) {
    return this.call<{ staff: boolean; rows: ReviewRow[] }>(`/local/workspace/alignment/rows?ids=${ids.map(encodeURIComponent).join(",")}`);
  }

  alignmentSearch(deck: string, q: string) {
    return this.call<{ staff: boolean; rows: ReviewRow[] }>(`/local/workspace/alignment/search?${new URLSearchParams({ deck, q }).toString()}`);
  }

  workspaceItems(type: string, query: { q?: string; page?: number } = {}) {
    const params = new URLSearchParams({ type, page: String(query.page ?? 1) });
    if (query.q) params.set("q", query.q);
    return this.call<{ items: WorkspaceItem[]; total: number; page: number; size: number }>(`/local/workspace/items?${params.toString()}`);
  }

  private async researchFile(slug: string, path: string): Promise<Response> {
    const r = await fetch(researchFileUrl(slug, path), { headers: { authorization: `Bucket ${this.token}` } });
    if (!r.ok) throw new ApiError(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "", r.status);
    return r;
  }

  async researchText(slug: string, path: string): Promise<string> {
    return (await this.researchFile(slug, path)).text();
  }

  async image(slug: string, path: string): Promise<string> {
    const r = await this.researchFile(slug, path);
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!IMAGE_TYPES.includes(type)) throw new Error("That file is not an image this window shows.");
    const blob = await r.blob();
    if (blob.size > IMAGE_MAX_BYTES) throw new Error("That image is over 8 MB.");
    return asDataUrl(blob.type === type ? blob : new Blob([blob], { type }));
  }

  wordLicence() {
    return this.call<WordLicence>("/local/words/licence");
  }

  wordDecks() {
    return this.call<WordDecks>("/local/words/decks");
  }

  library() {
    return this.call<LibraryBody>("/local/library");
  }

  libraryRefresh() {
    return this.call<LibraryBody>("/local/library/refresh", { method: "POST", body: {} });
  }

  libraryInstall(id: string) {
    return this.call<LibraryBody>("/local/library/install", { method: "POST", body: { id } });
  }

  libraryRemove(id: string) {
    return this.call<LibraryBody>("/local/library/remove", { method: "POST", body: { id } });
  }

  libraryExport(id: string, replace = false) {
    return this.call<{ name: string; folder: string }>("/local/library/export", { method: "POST", body: { id, replace } });
  }

  async libraryExportBytes(id: string) {
    const r = await fetch(`/local/library/export?id=${encodeURIComponent(id)}`, { headers: { authorization: `Bucket ${this.token}` } });
    if (!r.ok) throw new ApiError("", r.status);
    return r.blob();
  }

  async libraryImport(file: Blob) {
    const r = await fetch("/local/library/import", { method: "POST", headers: { authorization: `Bucket ${this.token}`, "content-type": "application/octet-stream" }, body: file });
    const data = (await r.json().catch(() => ({}))) as LibraryBody & { installed?: string; error?: string };
    if (!r.ok) throw new ApiError(data.error ?? "", r.status);
    return data as LibraryBody & { installed: string };
  }

  polingualLink() {
    return this.call<LinkStatus>("/local/polingual-link");
  }

  setPolingualLink(url: string) {
    return this.call<LinkStatus>("/local/polingual-link", { method: "POST", body: { url } });
  }

  async linkSearch(q: string, mode: LinkMode, o: { waitMs?: number; tries?: number } = {}) {
    for (let i = 0; i < (o.tries ?? 60); i++) {
      const r = await fetch(`/local/polingual-link/search?q=${encodeURIComponent(q)}&mode=${mode}`, { headers: { authorization: `Bucket ${this.token}` } });
      const data = (await r.json().catch(() => ({}))) as LinkSearch & { error?: string };
      if (r.status === 202) {
        await new Promise((go) => setTimeout(go, o.waitMs ?? 2000));
        continue;
      }
      if (!r.ok) throw new ApiError(data.error ?? "", r.status);
      return data;
    }
    throw new ApiError("the search took too long", 504);
  }

  installedDecks() {
    return this.call<DecksBody>("/local/deck-files");
  }

  wordSearch(q: string) {
    return this.call<WordSearch>(`/local/words/search?q=${encodeURIComponent(q)}`);
  }

  wordLessons(deck: string) {
    return this.call<WordLessons>(`/local/words/lessons?deck=${encodeURIComponent(deck)}`);
  }

  wordLesson(deck: string, n: number) {
    return this.call<LessonPage & { credit: WordCredit }>(`/local/words/lesson?deck=${encodeURIComponent(deck)}&n=${n}`);
  }

  wordConcepts(page: number) {
    return this.call<ConceptPage & { credit: WordCredit }>(`/local/words/concepts?page=${page}`);
  }

  wordQuiz(pick: WordQuizPick) {
    const query = "concepts" in pick ? `concepts=${pick.concepts}` : `deck=${encodeURIComponent(pick.deck)}&lesson=${pick.lesson}`;
    return this.call<{ questions: WorkQuestion[]; credit: WordCredit }>(`/local/words/quiz?${query}`);
  }

  wordAnswer(id: string, response: string, elapsedMs: number) {
    return this.call<WorkAnswer>("/local/words/answer", { method: "POST", body: { id, response, elapsedMs } });
  }

  workForget() {
    return this.call<{ cleared: boolean }>("/local/work-quiz/forget", { method: "POST", body: {} });
  }

  workNext() {
    return this.call<WorkQuestion>("/local/work-quiz/next");
  }

  dailyQuiz(day: string) {
    return this.call<DailyQuiz>(`/local/work-quiz/daily?day=${encodeURIComponent(day)}`);
  }

  dailyAnswer(day: string, id: string, response: string, elapsedMs: number) {
    return this.call<DailyAnswer>("/local/work-quiz/answer", { method: "POST", body: { day, id, response, elapsedMs } });
  }

  workAnswer(id: string, response: string, elapsedMs: number) {
    return this.call<WorkAnswer>("/local/work-quiz/answer", { method: "POST", body: { id, response, elapsedMs } });
  }

  async ros<K extends RosResource>(resource: K): Promise<RosPayloads[K] | null> {
    const r = await fetch(ROS_PATHS[resource].local, { headers: { authorization: `Bucket ${this.token}` } });
    if (r.status === 404) return null;
    if (!r.ok) throw new ApiError(resource, r.status);
    return parseRos(resource, await r.json());
  }

  canonSearch(q: string, branch = "", topK = 20) {
    const p = new URLSearchParams({ q, top_k: String(topK) });
    if (branch) p.set("branch", branch);
    return this.call<{ results: CanonHit[] }>(`/local/canon/search?${p}`).then((r) => r.results);
  }

  canonExcerpt(id: number) {
    return this.call<CanonExcerpt>(`/local/canon/excerpt?id=${id}`);
  }

  canonAbout() {
    return this.call<CanonAbout>("/local/canon/licences");
  }

  canonGraph(): Promise<CanonGraph | null> {
    return this.call<CanonGraph>("/local/canon/graph").catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    });
  }

  openLink(url: string) {
    return this.call<{ opened: string }>("/local/open", { method: "POST", body: { url } });
  }

  exploreSaved() {
    return this.call<unknown>("/local/explore/saved");
  }

  putExploreSaved(state: unknown) {
    return this.call<unknown>("/local/explore/saved", { method: "POST", body: state });
  }

  notes() {
    return this.call<{ notes: Note[] }>("/local/notes").then((r) => r.notes);
  }

  saveNote(note: { id?: string; title: string; body: string; pinned: boolean }) {
    return this.call<Note>("/local/notes", { method: "POST", body: note });
  }

  deleteNote(id: string) {
    return this.call<{ deleted: string }>("/local/notes/delete", { method: "POST", body: { id } });
  }

  history() {
    return this.call<HistoryData>("/local/history");
  }

  importHistory(file: unknown) {
    return this.call<{ productions: number }>("/local/history/import", { method: "POST", body: file });
  }

  forgetHistory() {
    return this.call<{ cleared: boolean }>("/local/history/forget", { method: "POST", body: {} });
  }

  data() {
    return this.call<{ datasets: Dataset[] }>("/local/data").then((r) => r.datasets);
  }

  dataRecords(dataset: string, query: DataQuery = {}) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") p.set(k, String(v));
    return this.call<DataPage>(`/local/data/${encodeURIComponent(dataset)}/records?${p}`);
  }

  dataRecord(dataset: string, id: string) {
    return this.call<DataDetail>(`/local/data/${encodeURIComponent(dataset)}/records/${encodeURIComponent(id)}`);
  }
}
