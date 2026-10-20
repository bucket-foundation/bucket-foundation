import React from "react";
import { render } from "ink";
import pack from "../../content/pack.json" with { type: "json" };
import langCorpus from "../../content/lang-corpus.json" with { type: "json" };
import canonPack from "../../content/canon.json" with { type: "json" };
import explorePack from "../../content/explore.json" with { type: "json" };
import rowSetPack from "../../content/explore-rows.json" with { type: "json" };
import wordPack from "../../content/words.json" with { type: "json" };
import deckCatalog from "../../content/deck-catalog.json" with { type: "json" };
import researchIndex from "../../content/research-index.json" with { type: "json" };
import researchBlobsFile from "../../content/research-blobs.json" with { type: "file" };
import { join } from "node:path";
import { App, type AppSources } from "../app";
import { spawn } from "node:child_process";
import { formLines, listAnalyses, parseAnalyzeArgs, startAnalysis, type AnalysisResult, type AnalyzeOptions } from "../analyze";
import { AnalysisBrowser, AnalyzeRun } from "../analyze-view";
import type { Pack, PackDeck } from "../pack/export";
import { dataDir, ensureDataDir, openSession, pickKeyring, promptPassphrase, readPassphraseFd, type Session } from "../setup";
import { loadBank, loadReview, loadScores } from "../hai/files";
import { HaiStore } from "../hai/store";
import { freeze, parseToolArgs, review, score } from "../hai/tools";
import { atlasFrontier, fitWidth, frontierLines, frontierOptions, NO_ATLAS, writeFrontierSvg } from "./atlas";
import { analysisRows, colorEnabled, interactive, JSON_SHAPES, jsonLine, pick, statRows, textRows, whoRows } from "./out";
import { countOf, keyringOptions, NoDataError, noteOptions, searchOptions, type Invocation, UsageError } from "./run";
import { directBackend, findServer, writeServerRecord, type LearnBackend } from "../core/backend";
import { daily, learnDue, learnPath, learnWordPath, quizJson, reviewJson, screen, wordBackend } from "./learn";
import { creditLine, DeckWordBook, searchWords, wordBookFor, wordHitLine } from "../core/word-decks";
import { deckLine, deckRow, deckRows, DeckError, decksDir, removeDeck, RESTART_NOTE } from "../decks";
import { creditedWordRoutes, deckRoutes } from "../deck-routes";
import { LINK_BODY_BYTES, PolingualLink, polingualLinkRoutes, pythonEmbedder } from "../polingual-link";
import { exportDeck, installAny } from "../deck-file";
import { IMPORT_BODY_BYTES as DECK_IMPORT_BYTES, Library, libraryRoutes, UNSIGNED_BUNDLE, verifyCatalog, type SignedCatalog } from "../library";
import type { WordPack } from "../pack/words";
import { WordSession, wordRoutes } from "../words";
import { localDay } from "../chat-sources";
import { randomBytes } from "node:crypto";
import { excerptText, packCanon, parseId, searchCanon, searchParams, searchText, searchTsv, showExcerpt } from "../core/search";
import { EXIT } from "./table";
import { readImport, readText, runResearch } from "./notes";
import { directResearch, serverResearch } from "../core/research";
import { provenServer } from "../core/remote";
import { graphView } from "./screens";
import { HaiApp } from "../hai/view";
import { doctorLines, doctorPassed, runDoctor } from "../doctor";
import { exec as platformExec, execSync, platformFor } from "../platform";
import { completionScript, isShell } from "./completion";
import { reportRows, reportSentences } from "../hai/report-text";
import { report } from "../hai/session";
import { IMPORT_BODY_BYTES, localRoutes } from "../local";
import { canonRoutes, CanonStore, OPEN_BODY_BYTES, syncCanon } from "../canon";
import { exploreRoutes, ExploreStore, SAVED_BODY_BYTES, syncExplore, syncRowSets } from "../explore";
import type { RowSetPack } from "../pack/row-sets/index";
import type { CanonPack } from "../pack/canon";
import { canonAdapter, dataRoutes, exploreAdapter, learningAdapter, ownAdapter, rowSetAdapter } from "../data";
import type { ExplorePack } from "../pack/explore";
import { advisorRoutes, REVIEW_BODY_BYTES } from "../advisor";
import { PeopleStore } from "../people";
import { JOB_BODY_BYTES, jobRoutes } from "../job-routes";
import { jobSpecs } from "../job-specs";
import { JobRunner } from "../jobs";
import { isSidecar, parentGone } from "../parent";
import { packLearnAtoms } from "../../../../src/lib/research-os/work-quiz/resources";
import { BEADS_BODY_BYTES, WorkQuizStore, workQuizRoutes } from "../work-quiz";
import { MAX_BODY, NOTES_BODY_BYTES, NotesStore, notesRoutes } from "../notes";
import { HISTORY_BODY_BYTES, HistoryStore, historyRoutes } from "../history";
import { cacheRoot } from "../pyruntime";
import pysrc from "../../content/pysrc.json" with { type: "json" };
import type { PySource } from "../pack/pysrc";
import { saveTextToDownloads } from "../downloads";
import { BUNDLED_ROS, RosGraph, rosLiveRoutes, rosRoutes, saveToDownloads, syncRosGraph } from "../ros";
import { Research, researchCacheRoot, ResearchError, researchRoutes, SIDE_PACK_BYTES } from "../research";
import { addLines, answerKey, approvalLines, installLines, researchAdd, researchAnswer, researchBuilds, researchInstall, researchWaiting } from "./research";
import { createInterface } from "node:readline";
import { FILE_BODY_BYTES, LocalOutputs, ResearchWork, researchWorkRoutes, UPLOAD_BODY_BYTES } from "../research-work";
import { workspaceRoutes } from "../workspace";
import { alignmentRoutes } from "../alignment";
import alignmentReview from "../../content/alignment-review.json" with { type: "json" };
import type { AlignmentReviewPack } from "../pack/alignment-review";
import { answer, BuildSwitch, ConsentStore, emitConsent, emitSettled, guardConsentText, guardStdout, shellDecides } from "../research-consent";
import { researchBuildRoutes, ResearchBuilds, researchSpecs } from "../research-jobs";
import { PAGES_KEEP, researchPageRoutes, ResearchPages } from "../research-pdf";
import type { ResearchBlobs, ResearchIndex } from "../pack/research";
import { startServe, type Route } from "../serve";
import { checkUpdate, describeUpdate } from "../update";
import { VERSION } from "../version";
import { NOTIFY_BODY_BYTES, settingsRoutes } from "../settings";
import { describeOutcome, updateNow, updateRoutes } from "../install";
import { AppWindow, askRunningApp, checkRoute, processTable, readApp, requestReopen, RouteError, routeUrl, runtimeDir, ROUTE_WAIT_MS, takeReopen, takeRoute, uiDir, windowRoutes, writeApp, writeRoute } from "../window";
import { defaultDeps, quizCommand, writeQuizRoots } from "../notify";
import { askCommand, llmCommand } from "./llm";
import { Database } from "bun:sqlite";
import { agentsCmd } from "./agents-cmd";
import { agentRoutes, canonRunner } from "../agents";
import { defaultWaitDeps, FOCUS_BODY_BYTES, WAIT_BODY_BYTES, waitCommand, waitRoutes } from "../wait";
import { hostname } from "node:os";
import { generatedFigures, generationRoutes } from "../generation-routes";
import { findRepo, GenerateError, loadRegistry, pastRuns, runFolder, runGeneration } from "../generate";
import { openRemote } from "../sync";
import type { RemoteSync } from "../../../../src/lib/academy/remote-sync";
import { startSyncLoop, syncRoutes } from "../sync/routes";
import { pullRemoteProgress, type LearnStore } from "../sync/pull-progress";

function printResult(o: AnalyzeOptions, r: AnalysisResult): number {
  const { code, report, stderr, cancelled } = r;
  if (cancelled) {
    console.error("cancelled");
    return 130;
  }
  if (!report) {
    console.error(stderr.trim() || "analyzer produced no report");
    return code || 1;
  }
  if (o.json) console.log(JSON.stringify(pick(JSON_SHAPES.analyze, report), null, 2));
  else {
    for (const l of formLines(report)) console.log(l);
    if (code !== 0) console.log("stopped on form errors; rerun with --force to analyze anyway");
    else console.log(`helix: ${report.helix?.status}${report.helix?.reason ? `, ${report.helix.reason}` : ""}${report.helix?.run_dir ? ` ${report.helix.run_dir}` : ""}`);
    console.log(`report: ${join(report.dir, "report.md")}`);
  }
  return code;
}

async function analyzeCmd(argv: string[]): Promise<number> {
  const o = parseAnalyzeArgs(argv);
  const run = startAnalysis(o);
  if (o.tui) {
    let result: AnalysisResult | null = null;
    await render(<AnalyzeRun run={run} file={o.file} onResult={(r) => (result = r)} />, { exitOnCtrlC: false }).waitUntilExit();
    const r = result ?? (await run.done);
    return r.cancelled ? 130 : r.report ? r.code : r.code || 1;
  }
  const onInt = () => run.cancel();
  process.on("SIGINT", onInt);
  try {
    return printResult(o, await run.done);
  } finally {
    process.off("SIGINT", onInt);
  }
}

async function researchCmd(inv: Invocation, json: boolean): Promise<number> {
  const home = dataDir();
  try {
    if (inv.command.name === "research add") {
      ensureDataDir(home);
      const added = researchAdd(inv.positionals[0], home, (researchIndex as unknown as ResearchIndex).outputs.map((o) => o.slug));
      if (json) console.log(jsonLine("research add", added));
      else for (const line of addLines(added)) console.log(line);
      return EXIT.ok;
    }
    if (inv.command.name === "research builds") {
      ensureDataDir(home);
      console.log(researchBuilds(home, inv.positionals[0], inv.positionals[1]));
      return EXIT.ok;
    }
    if (inv.command.name === "research approve") {
      const server = await provenServer(home);
      if (!server) throw new ResearchError("Bucket is not running here; open the app or run bkt serve, then ask for the build again", 409);
      if (inv.values.yes === true || inv.values.deny === true) {
        const answer = await researchAnswer(server, answerKey(inv.values), inv.values.yes === true && inv.values.deny !== true);
        console.log(answer.denied ? "Refused. Nothing ran." : "Allowed. The build is running.");
        return EXIT.ok;
      }
      const waiting = await researchWaiting(server);
      for (const line of approvalLines(waiting)) console.log(line);
      if (!waiting.pending) return EXIT.noData;
      if (!process.stdin.isTTY || !process.stdout.isTTY) return EXIT.ok;
      const typed = await new Promise<string>((done) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        rl.question("Allow this build? Type yes to allow, anything else to refuse: ", (line) => {
          rl.close();
          done(line.trim().toLowerCase());
        });
      });
      const answer = await researchAnswer(server, { id: waiting.pending.id, digest: waiting.pending.digest }, typed === "yes");
      console.log(answer.denied ? "Refused. Nothing ran." : "Allowed. The build is running.");
      return EXIT.ok;
    }
    const done = await researchInstall(inv.positionals[0], home, await provenServer(home));
    if (json) console.log(jsonLine("research install", done));
    else for (const line of installLines(done)) console.log(line);
    return EXIT.ok;
  } catch (e) {
    if (!(e instanceof ResearchError)) throw e;
    console.error(`bkt: ${e.message}`);
    return EXIT.failure;
  }
}

let heldBook: DeckWordBook | null = null;

function wordBook(): DeckWordBook {
  heldBook ??= wordBookFor(wordPack as unknown as WordPack, dataDir(), { onError: (m) => console.error(`bkt: ${m}`) });
  return heldBook;
}

function dropWordBook(): void {
  heldBook?.close();
  heldBook = null;
}

function servedWordRoutes(workQuiz: WorkQuizStore): Record<string, Route> {
  let held: WordSession | null = null;
  const session = () => (held && held.book === wordBook() ? held : (held = new WordSession(wordBook(), workQuiz)));
  const keys = Object.keys(wordRoutes(session()));
  return creditedWordRoutes(Object.fromEntries(keys.map((key): [string, Route] => [key, (req, url) => wordRoutes(session())[key](req, url)])), session, wordBook);
}

const DECK_COMMANDS: Record<string, "list" | "install" | "remove" | "export"> = {
  "decks export": "export",
  "decks list": "list",
  "decks install": "install",
  "decks remove": "remove",
  "words list": "list",
  "words install": "install",
  "words remove": "remove",
};

async function decks(inv: Invocation, json: boolean): Promise<number> {
  const action = DECK_COMMANDS[inv.command.name];
  const home = dataDir();
  try {
    if (action === "list") {
      const rows = deckRows(home, inv.positionals[0] ?? process.env.BKT_DECK_SOURCE ?? null);
      const have = new Set(rows.map((r) => r.id));
      if (inv.values.catalog === true) {
        const catalog = verifyCatalog(deckCatalog as SignedCatalog);
        if (!catalog) console.error(`bkt: ${UNSIGNED_BUNDLE}`);
        for (const m of catalog?.decks ?? []) if (!have.has(m.id)) rows.push(deckRow(m, false, null));
      }
      if (json) console.log(jsonLine("decks list", { decks: rows }));
      else for (const r of rows) console.log(deckLine(r));
      if (!rows.length) throw new NoDataError("no deck is installed; run bkt decks install <file-or-folder>");
      return EXIT.ok;
    }
    if (action === "install") {
      ensureDataDir(home);
      const m = await installAny(home, inv.positionals[0]);
      const row = deckRow(m, true, join(decksDir(home), m.id));
      if (json) console.log(jsonLine("decks install", row));
      else {
        console.log(`Installed ${m.title}: ${m.counts.cards.toLocaleString("en-US")} ${m.kind === "words" ? "words" : "cards"}, version ${m.version}, checksum matches.`);
        console.log(`${m.source}, ${m.licence}, curated by ${m.curator}.`);
        console.log(RESTART_NOTE);
      }
      return EXIT.ok;
    }
    if (action === "export") {
      const made = await exportDeck(home, inv.positionals[0], inv.positionals[1], { replace: inv.values.replace === true });
      console.log(json ? jsonLine("decks export", { id: made.manifest.id, title: made.manifest.title, path: made.path, bytes: made.bytes }) : `Wrote ${made.manifest.title} to ${made.path}. ${made.manifest.source}, ${made.manifest.licence}.`);
      return EXIT.ok;
    }
    const gone = removeDeck(home, inv.positionals[0]);
    if (!gone) throw new NoDataError(`no installed deck matches ${inv.positionals[0]}; run bkt decks list`);
    console.log(json ? jsonLine("decks remove", { id: gone.id, title: gone.title, removed: true }) : `Removed ${gone.title}. ${RESTART_NOTE.replace("see it in", "drop it from")}`);
    return EXIT.ok;
  } catch (e) {
    if (e instanceof DeckError) {
      console.error(`bkt: ${e.message}`);
      return EXIT.failure;
    }
    throw e;
  }
}

const LEARN = new Set(["learn due", "learn path", "learn quiz", "learn review", "daily"]);

async function learn(inv: Invocation, json: boolean): Promise<number> {
  const name = inv.command.name;
  const content = pack as Pack;
  let deck: PackDeck | null = null;
  let language: string | null = null;
  const book = wordBook();
  const credit = book.credit.text;
  if (name === "learn path" && inv.positionals[0] !== undefined) {
    deck = (content.decks ?? []).find((d) => d.id === inv.positionals[0]) ?? null;
    language = deck ? null : book.resolveDeck(inv.positionals[0]);
    if (!deck && !language) throw new UsageError(`unknown deck ${inv.positionals[0]}; run bkt learn path for the list`, inv.command);
  }
  if (name === "learn quiz" && typeof inv.values.deck === "string") {
    language = book.resolveDeck(inv.values.deck);
    if (!language) throw new UsageError(`unknown language ${inv.values.deck}; --deck takes one of ${book.languages().map((l) => book.set.names[l]).join(", ")}`, inv.command);
  }
  const size = countOf(inv);
  const day = inv.positionals[0] ?? localDay(Date.now());
  const run = (b: LearnBackend) => {
    if (name === "learn due") return learnDue(b, size, json);
    if (name === "learn path" && language) return learnWordPath(b, language, book.creditText([language]), json);
    if (name === "learn path") return learnPath(b, deck, deck ? (content.atoms?.[deck.id] ?? []) : [], json, undefined, credit);
    if (name === "learn quiz" && language) return json ? quizJson(wordBackend(b, language), size, inv.command, undefined, book.creditText([language])) : screen("quiz", wordBackend(b, language), size, book.creditText([language]));
    if (name === "learn quiz") return json ? quizJson(b, size, inv.command) : screen("quiz", b, size);
    if (name === "learn review") return json ? reviewJson(b, size, inv.command) : screen("review", b, size);
    return daily(b, day, json, inv.command);
  };
  const server = await findServer(dataDir());
  if (server) return run(server);
  const dir = ensureDataDir(dataDir());
  const session = await openSession(await pickKeyring(keyringOptions(inv), dir), dir);
  try {
    session.store.importPack(content.version, content.items);
    const wq = new WorkQuizStore(session.store, session.key);
    return await run(directBackend({ store: session.store, content, daily: wq.daily, record: (...a) => wq.record(...a), words: new WordSession(book, wq) }));
  } finally {
    session.store.close();
  }
}

const RESEARCH = new Set(["notes ls", "notes add", "notes show", "history", "import"]);

async function research(inv: Invocation, json: boolean): Promise<number> {
  const name = inv.command.name;
  const o = noteOptions(inv);
  const payload = {
    body: name === "notes add" ? (o.file !== null ? readText(o.file, MAX_BODY) : (o.body ?? "")) : undefined,
    data: name === "import" ? readImport(o.file!) : undefined,
  };
  const server = await provenServer(dataDir());
  if (server) return runResearch(name, o, json, serverResearch(server), payload);
  const dir = ensureDataDir(dataDir());
  const session = await openSession(await pickKeyring(keyringOptions(inv), dir), dir);
  try {
    const content = pack as Pack;
    session.store.importPack(content.version, content.items);
    const b = directResearch({
      store: session.store,
      notes: new NotesStore(session.store, session.key),
      history: new HistoryStore(session.store, session.key),
      decks: content.decks ?? [],
    });
    return await runResearch(name, o, json, b, payload);
  } finally {
    session.store.close();
  }
}

function spawnDetached(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: false, detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function serve(name: "serve" | "app", session: Session, dir: string, content: Pack, route: string | null): Promise<void> {
  const workQuiz = new WorkQuizStore(session.store, session.key);
  writeQuizRoots(dir, workQuiz.chat());
  const people = new PeopleStore(session.store, session.key);
  const runner = new JobRunner({
    root: join(dir, "jobs"),
    specs: jobSpecs({ src: pysrc as PySource, cacheRoot: cacheRoot(), dataRoot: join(dir, "fit-me"), people }),
  });
  syncCanon(session.store.db, canonPack as CanonPack);
  syncExplore(session.store.db, explorePack as unknown as ExplorePack);
  syncRowSets(session.store.db, rowSetPack as unknown as RowSetPack);
  syncRosGraph(session.store.db, content.version, content.atoms ?? {});
  const canon = new CanonStore(session.store.db);
  const explore = new ExploreStore(session.store.db);
  const cliToken = randomBytes(32).toString("base64url");
  const cliSecret = randomBytes(32).toString("base64url");
  const win = new AppWindow(runtimeDir(), join(dir, "window-profile"));
  const adapters = [
    learningAdapter(content),
    canonAdapter(canonPack as CanonPack),
    exploreAdapter(explorePack as unknown as ExplorePack),
    ...(rowSetPack as unknown as RowSetPack).sets.map(rowSetAdapter),
    ownAdapter(session.store, { analyses: () => runner.list().length }),
  ];
  const data = dataRoutes(adapters);
  const researchTrouble = (e: Error) => console.error(`bkt serve: research: ${e.message}`);
  const renders = { home: dir, repo: findRepo(process.env.BKT_REPO ?? process.cwd()) };
  const research = new Research({ index: researchIndex as unknown as ResearchIndex, blobs: async () => (await Bun.file(researchBlobsFile as unknown as string).json()) as ResearchBlobs }, undefined, dir, researchTrouble);
  const ownOutputs = new LocalOutputs(dir, { taken: (slug) => (researchIndex as unknown as ResearchIndex).outputs.some((o) => o.slug === slug) || research.staffHas(slug) });
  research.setLocal(ownOutputs);
  const buildRunner = new JobRunner({ root: join(dir, "research", "jobs", "build"), specs: researchSpecs({ os: platformFor().os, dataDir: dir, python: platformFor().python() }), keep: 20, frozenOnly: true });
  const buildGate = new BuildSwitch(dir);
  const toShell = isSidecar(process.env) ? guardStdout(process.stdout as unknown as { write: (chunk: unknown, ...rest: unknown[]) => boolean }) : null;
  if (toShell) {
    const say = console.log.bind(console);
    console.log = (...args: unknown[]) => say(...args.map((a) => (typeof a === "string" ? guardConsentText(a) : a)));
  }
  const buildConsent = new ConsentStore({ switch: buildGate, onDrop: (pending) => buildRunner.discard(pending.frozenDir), onOpen: (view) => toShell && emitConsent(toShell, view), onSettled: (id) => toShell && emitSettled(toShell, id) });
  const researchWork = new ResearchWork(research, dir, { open: (folder) => void spawn(platformFor().os === "darwin" ? "open" : platformFor().os === "win32" ? "explorer" : "xdg-open", [folder], { stdio: "ignore", detached: true }).on("error", researchTrouble).unref() });
  const builds = new ResearchBuilds({ research, runner: buildRunner, consent: buildConsent, gate: buildGate, os: platformFor().os, ownBuilds: (slug) => ownOutputs.buildsOn(slug) });
  const pagesRunner = new JobRunner({ root: join(dir, "research", "jobs", "pages"), specs: researchSpecs({ os: platformFor().os }), keep: PAGES_KEEP, frozenOnly: true });
  const remote = openRemote(session, dir);
  const syncTrouble = (m: string) => console.error(`bkt serve: sync: ${m}`);
  const pullProgress = () => pullRemoteProgress(remote, session.store);
  const stopSync = startSyncLoop(remote, pullProgress, syncTrouble);
  const srv = startServe({
    cliToken,
    cliSecret,
    match: data.match,
    routes: {
      ...windowRoutes(win.routes),
      ...data.routes,
      ...canonRoutes(canon, { holdsDoi: (doi) => explore.hasPrimaryPaper(doi), graph: (canonPack as CanonPack).graph ?? null }),
      ...exploreRoutes(explore, canon),
      ...localRoutes(session.store, { content, langCorpus, saveExport: saveTextToDownloads() }),
      ...syncRoutes(remote, { label: () => hostname(), onError: syncTrouble, pullProgress }),
      ...rosRoutes(BUNDLED_ROS, (e) => console.error(`bkt serve: ${e.message}`)),
      ...rosLiveRoutes(new RosGraph(session.store.db), Date.now, { saveExport: saveToDownloads() }),
      ...advisorRoutes(people),
      ...jobRoutes(runner),
      ...researchRoutes(research, researchTrouble),
      ...researchWorkRoutes(researchWork, researchTrouble, ownOutputs),
      ...alignmentRoutes(alignmentReview as unknown as AlignmentReviewPack),
      ...workspaceRoutes({ research, changedPaths: (slug) => researchWork.changedPaths(slug), datasets: () => adapters.map((a) => a.info()), rowSets: () => (rowSetPack as unknown as RowSetPack).sets.map((s) => ({ id: s.id, label: s.label, licence: s.licence, modes: s.pages[0]?.modes ?? [] })), generated: () => generatedFigures(renders) }, researchTrouble),
      ...generationRoutes(renders, researchTrouble),
      ...researchPageRoutes(new ResearchPages({ research, runner: pagesRunner, consent: new ConsentStore(), cache: join(researchCacheRoot(), "pages"), os: platformFor().os, built: (slug, path) => researchWork.built(slug, path) }), researchTrouble),
      ...researchBuildRoutes(builds, researchTrouble),
      ...workQuizRoutes(workQuiz, { onChat: (on) => writeQuizRoots(dir, on), atoms: packLearnAtoms((pack as Pack).atoms), words: wordBook().bundled.set }),
      ...servedWordRoutes(workQuiz),
      ...deckRoutes({ home: dir, book: wordBook, onError: (m) => console.error(`bkt serve: ${m}`) }),
      ...libraryRoutes(new Library({ home: dir, bundled: deckCatalog as SignedCatalog, url: process.env.BKT_DECK_CATALOG_URL, onChange: dropWordBook }), (m) => console.error(`bkt serve: deck library: ${m}`)),
      ...polingualLinkRoutes(new PolingualLink({ dir, key: session.key, credit: wordBook().credit, embed: pythonEmbedder(platformFor().python()), onError: (m) => console.error(`bkt serve: word database: ${m.split("\n")[0].slice(0, 160)}`) })),
      ...notesRoutes(new NotesStore(session.store, session.key)),
      ...historyRoutes(new HistoryStore(session.store, session.key)),
      ...settingsRoutes({ dataDir: dir, timerDir: platformFor().timerDir(), quiz: defaultDeps }),
      ...updateRoutes({ current: VERSION }),
      ...waitRoutes(defaultWaitDeps),
      ...agentRoutes({ wait: defaultWaitDeps, llmHome: dir, keyring: session.keyring, which: (b) => Bun.which(b), run: canonRunner(canon), spawn: spawnDetached }),
    },
    routeBodyBytes: {
      "POST /local/import": IMPORT_BODY_BYTES,
      "POST /local/research/install": SIDE_PACK_BYTES,
      "POST /local/research/file": FILE_BODY_BYTES,
      "POST /local/research/upload": UPLOAD_BODY_BYTES,
      "POST /local/advisor/import": REVIEW_BODY_BYTES,
      "POST /local/prime-directions/import": REVIEW_BODY_BYTES,
      "POST /local/jobs": JOB_BODY_BYTES,
      "POST /local/work-quiz/beads": BEADS_BODY_BYTES,
      "POST /local/settings/notify": NOTIFY_BODY_BYTES,
      "POST /local/polingual-link": LINK_BODY_BYTES,
      "POST /local/library/import": DECK_IMPORT_BYTES,
      "POST /local/notes": NOTES_BODY_BYTES,
      "POST /local/explore/saved": SAVED_BODY_BYTES,
      "POST /local/history/import": HISTORY_BODY_BYTES,
      "POST /local/open": OPEN_BODY_BYTES,
      "POST /local/focus": FOCUS_BODY_BYTES,
      "POST /local/wait": WAIT_BODY_BYTES,
    },
    uiDir: uiDir(),
    onError: (e) => console.error(`bkt serve: ${e.message}`),
  });
  const release = writeApp(runtimeDir(), { pid: process.pid, port: srv.port });
  const releaseServer = writeServerRecord(dir, { pid: process.pid, port: srv.port, token: cliToken, secret: cliSecret });
  const fresh = () => {
    srv.remint();
    return srv.url;
  };
  const reopen = () => {
    const to = takeRoute(runtimeDir());
    if (name === "app" || !isSidecar(process.env)) win.relaunch(to, fresh);
    else console.log(routeUrl(fresh(), to));
  };
  if (process.platform !== "win32") process.on("SIGUSR1", reopen);
  const asked = process.platform === "win32" ? setInterval(() => takeReopen(runtimeDir()) && reopen(), 1000) : undefined;
  win.forget();
  if (name === "app") win.open(routeUrl(srv.url, route));
  else console.log(srv.url);
  await new Promise<void>((done) => {
    process.once("SIGINT", done);
    process.once("SIGTERM", done);
    void parentGone(process.env, () => Bun.stdin.stream(), (line) => answer(line, shellDecides(() => buildConsent.view(), (id, digest, allow) => builds.answer(id, digest, allow)), (e) => console.error(`bkt serve: build approval: ${e.message}`))).then(() => {
      console.error("bkt serve: the Bucket window process is gone; stopping");
      done();
    });
    if (name === "app") void win.closed(() => runner.busy()).then(done);
  });
  process.off("SIGUSR1", reopen);
  clearInterval(asked);
  stopSync();
  win.forget();
  runner.stopAll();
  pagesRunner.stopAll();
  buildRunner.stopAll();
  release();
  releaseServer();
  srv.stop();
}

function reopenRunningApp(route: string | null): boolean {
  const running = readApp(runtimeDir());
  if (!running) return false;
  const signal = (pid: number) => (process.platform === "win32" ? requestReopen(runtimeDir()) : void process.kill(pid, "SIGUSR1"));
  console.log(askRunningApp(runtimeDir(), running, route, { table: processTable(), signal }));
  return true;
}

async function analyses(inv: Invocation, json: boolean): Promise<number> {
  const root = inv.positionals[0];
  const tty = { stdin: !!process.stdin.isTTY, stdout: !!process.stdout.isTTY };
  if (!json && interactive(process.env, tty)) {
    await render(<AnalysisBrowser root={root} />).waitUntilExit();
    return EXIT.ok;
  }
  const items = listAnalyses(root);
  if (json) console.log(jsonLine("analyses", { analyses: items }));
  else if (items.length) console.log(analysisRows(items, inv.values.where === true));
  if (!items.length) throw new NoDataError("no saved analyses; run bkt analyze <file>");
  return EXIT.ok;
}

async function doctor(inv: Invocation, json: boolean): Promise<number> {
  const env = process.env;
  const platform = platformFor(process.platform, { env });
  const tty = { stdin: !!process.stdin.isTTY, stdout: !!process.stdout.isTTY };
  const checks = await runDoctor({
    dir: dataDir(env),
    env,
    platform,
    keyringKind: typeof inv.values.keyring === "string" ? inv.values.keyring : undefined,
    keyring: () => platform.keyring(),
    pack: pack as Pack,
    explore: explorePack as unknown as ExplorePack,
    words: wordPack as unknown as WordPack,
    uiDir: uiDir(env),
    runtimeDir: runtimeDir(env),
    tty,
    columns: process.stdout.columns,
    run: execSync,
    alive: (pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    },
  });
  const passed = doctorPassed(checks);
  if (json) console.log(jsonLine("doctor", { ok: passed, checks }));
  else for (const line of doctorLines(checks)) console.log(line);
  return passed ? EXIT.ok : EXIT.failure;
}

function wordSearch(inv: Invocation, json: boolean): number {
  const o = searchOptions(inv);
  const book = wordBook();
  const found = searchWords(book, book.files, o.q, { limit: o.limit, lang: typeof inv.values.lang === "string" ? inv.values.lang : null, onError: (m) => console.error(`bkt: ${m}`) });
  if (json) console.log(jsonLine("search words", found));
  else if (found.hits.length) {
    for (const h of found.hits) console.log(wordHitLine(h));
    for (const credit of found.credits) console.log(creditLine(credit));
  }
  if (!found.hits.length) throw new NoDataError(`no word matches ${o.q} in ${found.words.toLocaleString("en-US")} words across ${found.languages} languages`);
  return EXIT.ok;
}

function search(inv: Invocation, json: boolean): number {
  if (inv.values.words === true) return wordSearch(inv, json);
  const o = searchOptions(inv);
  const found = searchCanon(packCanon(canonPack as CanonPack), searchParams(o.q, o), { matchedOnly: true });
  if (!found.ok) throw new NoDataError("this copy of bkt holds no canon; run bkt update");
  if (json) console.log(jsonLine("search", { query: o.q, mode: found.mode, results: found.results }));
  else if (o.tsv) {
    if (found.results.length) console.log(searchTsv(found.results));
  } else if (found.results.length) console.log(searchText(found.results));
  if (!found.results.length) throw new NoDataError(`nothing in the canon matches ${o.q}`);
  return EXIT.ok;
}

function canonShow(inv: Invocation, json: boolean): number {
  const id = parseId(inv.positionals[0]);
  const found = id === null ? null : showExcerpt(packCanon(canonPack as CanonPack), id);
  if (!found) throw new NoDataError(`no canon excerpt numbered ${inv.positionals[0]}; bkt search finds one`);
  console.log(json ? jsonLine("canon show", found) : excerptText(found));
  return EXIT.ok;
}

function openInWindow(route: string): void {
  const running = readApp(runtimeDir());
  if (running && process.platform !== "win32") {
    writeRoute(runtimeDir(), route);
    process.kill(running.pid, "SIGUSR1");
    return;
  }
  const self = Bun.main.endsWith(".tsx") ? [process.execPath, Bun.main] : [process.execPath];
  const [cmd, ...rest] = [...self, "app", "--route", route];
  spawn(cmd, rest, { detached: true, stdio: "ignore" }).unref();
}

function tuiSources(session: Session): AppSources {
  const graph = graphView((canonPack as { graph?: unknown }).graph);
  return {
    canon: packCanon(canonPack as CanonPack),
    graph,
    research: () => {
      const saved = new HistoryStore(session.store, session.key).snapshot();
      return {
        notes: new NotesStore(session.store, session.key).list().slice(0, 8),
        saved: saved ? { results: saved.productions.length, importedAt: saved.importedAt } : null,
      };
    },
    jobs: () => listAnalyses(),
    openRoute: openInWindow,
  };
}

async function accountCmd(name: "login" | "logout" | "sync", remote: RemoteSync, json: boolean, store: LearnStore): Promise<number> {
  if (name === "logout") {
    await remote.logout();
    console.log(json ? jsonLine("logout", { signed_in: false }) : "Signed out on this device.");
    return EXIT.ok;
  }
  if (name === "login") {
    const s = await remote.login("cli", hostname(), (p) => {
      if (json) console.log(jsonLine("login", { user_code: p.user_code, verification_uri: p.verification_uri, warning: p.warning ?? null }));
      else console.log(`Open ${p.verification_uri} and confirm the code ${p.user_code}. Waiting up to ${Math.round(p.expires_in / 60)} minutes.`);
      if (p.warning && !json) console.error(`bkt login: ${p.warning}; open the link in a browser anyway or try again later.`);
    });
    console.log(json ? jsonLine("login", { signed_in: true, user_id: s.user_id, device_id: s.device_id }) : "Signed in. Study progress now syncs with your account.");
    return EXIT.ok;
  }
  await remote.sync.flush();
  const pulled = await remote.sync.pullLog();
  const merged = pulled === null ? null : await pullRemoteProgress(remote, store);
  const out = { mode: remote.sync.mode(), pending: remote.sync.pending().length, held: remote.sync.held().length, pulled: pulled?.length ?? null, merged: merged ?? [] };
  console.log(json ? jsonLine("sync", out) : out.pending ? `${out.pending} changes waiting to sync, ${out.pulled ?? 0} pulled` : `synced, ${out.pulled ?? 0} pulled, ${out.merged.length} decks updated from your account`);
  return out.mode === "log" ? EXIT.ok : EXIT.failure;
}

function generateCmd(inv: Invocation, json: boolean): number {
  const v = inv.values;
  const home = dataDir();
  if (v.past === true) {
    const runs = pastRuns(home, inv.positionals[0]).map((r) => ({ name: r.name, folder: r.folder, created: r.record.created, params: r.record.params, outputs: r.record.outputs }));
    if (json) console.log(jsonLine("generate", { runs }));
    else if (!runs.length) console.log("No stored figures yet. bkt generate --list shows what can be made.");
    else for (const r of runs) console.log(`${r.created.slice(0, 16).replace("T", " ")}  ${r.name}  ${Object.values(r.params).join(" ")}  ${r.folder}`);
    return EXIT.ok;
  }
  const repo = findRepo(typeof v.repo === "string" ? v.repo : process.cwd());
  if (!repo) throw new UsageError("bkt generate runs inside the Bucket repository; pass --repo or run it from there", inv.command);
  const reg = loadRegistry(repo);
  if (v.list === true || !inv.positionals[0]) {
    const generations = reg.generations.map((g) => ({ name: g.name, about: g.about, inputs: g.inputs }));
    if (json) console.log(jsonLine("generate", { generations }));
    else for (const g of generations) console.log(`${g.name.padEnd(24)} ${g.about}${Object.keys(g.inputs).length ? ` (--${Object.keys(g.inputs).join(", --")})` : ""}`);
    return EXIT.ok;
  }
  const params: Record<string, string> = {};
  for (const k of ["problem", "label", "corpus"]) if (typeof v[k] === "string") params[k] = v[k] as string;
  const name = inv.positionals[0];
  const folder = runFolder(home, name, params, new Date());
  try {
    const rec = runGeneration(reg, name, params, { repo, out: folder });
    if (json) console.log(jsonLine("generate", { folder, outputs: rec.outputs }));
    else console.log(`Made ${name} in ${folder}: ${rec.outputs.join(", ")}`);
    return EXIT.ok;
  } catch (e) {
    if (e instanceof GenerateError) throw new UsageError(e.message, inv.command);
    throw e;
  }
}

export async function execute(inv: Invocation): Promise<number> {
  const name = inv.command.name;
  const json = inv.values.json === true;
  if (name === "version") {
    console.log(json ? jsonLine("version", { version: VERSION }) : VERSION);
    return EXIT.ok;
  }
  if (name === "update" && inv.values.install === true) {
    const o = await updateNow();
    console.log(json ? jsonLine("update", o) : describeOutcome(o));
    return o.status === "error" ? EXIT.failure : EXIT.ok;
  }
  if (name === "update") {
    const r = await checkUpdate();
    console.log(json ? jsonLine("update", r) : describeUpdate(r));
    return r.status === "error" ? EXIT.failure : EXIT.ok;
  }
  if (name === "quiz notify") return quizCommand(["notify", ...(inv.values.force === true ? ["--force"] : [])]);
  if (name === "quiz schedule") return quizCommand(["schedule", ...(typeof inv.values.at === "string" ? ["--at", inv.values.at] : []), ...(inv.values.force === true ? ["--force"] : [])]);
  if (name === "quiz unschedule") return quizCommand(["unschedule"]);
  if (name === "wait install" || name === "wait uninstall" || name === "wait status") return waitCommand([name.slice(5), ...(inv.values.gemini === true ? ["--gemini"] : [])]);
  let route: string | null = null;
  if (name === "app" && inv.values.route !== undefined) {
    try {
      route = checkRoute(inv.values.route);
    } catch (e) {
      throw e instanceof RouteError ? new UsageError(e.message, inv.command) : e;
    }
  }
  if (name === "app" && reopenRunningApp(route)) return EXIT.ok;
  if (name === "completion") {
    const shell = inv.positionals[0];
    if (!isShell(shell)) throw new UsageError(`unknown shell ${shell}`, inv.command);
    console.log(completionScript(shell));
    return EXIT.ok;
  }
  if (name === "doctor") return doctor(inv, json);
  if (name.startsWith("llm ")) return llmCmd(inv);
  if (name === "agents") return agentsCmd(inv, memoryCanon);
  if (name === "ask") return askCmd(inv);
  if (name === "generate") return generateCmd(inv, json);
  if (DECK_COMMANDS[name]) return decks(inv, json);
  if (name.startsWith("research ")) return researchCmd(inv, json);
  if (name === "licences") {
    const l = wordBook().licence;
    for (const line of [l.credit.text, l.changes, `${l.title}: ${l.credit.licenceHref}`, "", l.text.trimEnd()]) console.log(line);
    return EXIT.ok;
  }
  if (name === "search") return search(inv, json);
  if (name === "canon show") return canonShow(inv, json);
  if (name === "atlas frontier") {
    const o = frontierOptions(inv.values);
    const f = atlasFrontier(o.reach, undefined, o.full || undefined);
    if (!f) throw new NoDataError(NO_ATLAS);
    if (o.svg) writeFrontierSvg(f, o.svg);
    if (json) console.log(jsonLine("atlas frontier", f));
    else for (const line of frontierLines(f, o.width ?? fitWidth(process.stdout.columns), colorEnabled(process.env, { stdin: process.stdin.isTTY === true, stdout: process.stdout.isTTY === true }))) console.log(line);
    return EXIT.ok;
  }
  if (name === "analyze") return analyzeCmd(inv.args);
  if (name === "analyses") return analyses(inv, json);
  if (name === "hai freeze") {
    freeze(pack as Pack, parseToolArgs(inv.args));
    return EXIT.ok;
  }
  if (name === "hai review") {
    review(parseToolArgs(inv.args));
    return EXIT.ok;
  }
  if (name === "hai score") {
    await score(parseToolArgs(inv.args));
    return EXIT.ok;
  }

  if (LEARN.has(name)) return learn(inv, json);
  if (RESEARCH.has(name)) return research(inv, json);

  const dir = ensureDataDir(dataDir());
  const session = await openSession(await pickKeyring(keyringOptions(inv), dir), dir);
  const content = pack as Pack;
  const imported = session.store.importPack(content.version, content.items);
  try {
    if (name === "hai wipe") {
      new HaiStore(session.store, session.key).wipe();
      console.log("Probe data deleted.");
    } else if (name === "hai export") {
      const data = new HaiStore(session.store, session.key).export();
      console.log(json ? jsonLine("hai export", data) : JSON.stringify(pick(JSON_SHAPES["hai export"], data), null, 2));
    } else if (name === "hai report") {
      const h = new HaiStore(session.store, session.key);
      const scores = loadScores();
      for (const line of reportSentences(reportRows(report(h, scores), scores))) console.log(line);
    } else if (name === "hai") {
      const h = new HaiStore(session.store, session.key);
      await render(<HaiApp hai={h} data={{ bank: loadBank(), review: loadReview(), scores: loadScores() }} />).waitUntilExit();
    } else if (name === "init" || name === "whoami") {
      const who = {
        device: session.device.id,
        publicKey: session.device.publicKey,
        newDevice: session.device.created,
        keyring: session.keyring.kind,
        pack: content.version,
        imported,
        journal: session.store.journalMode(),
      };
      if (json) console.log(jsonLine("whoami", who));
      else {
        if (name === "init") console.log("Bucket is ready on this device.");
        console.log(textRows(whoRows(who)));
      }
    } else if (name === "forget people") {
      const n = new PeopleStore(session.store, session.key).forget(Date.now());
      console.log(`forgot ${n} people; a later import skips them unless you confirm`);
    } else if (name === "login" || name === "logout" || name === "sync") return await accountCmd(name, openRemote(session, dir), json, session.store);
    else if (name === "serve" || name === "app") await serve(name, session, dir, content, route);
    else if (name === "stats") {
      const s = session.store.stats(Date.now());
      console.log(json ? jsonLine("stats", s) : textRows(statRows(s)));
    } else await render(<App session={session} sources={tuiSources(session)} />).waitUntilExit();
    return EXIT.ok;
  } finally {
    session.store.close();
  }
}

function memoryCanon(): CanonStore {
  const db = new Database(":memory:");
  db.run("create table meta (k text primary key, v text not null)");
  syncCanon(db, canonPack as CanonPack);
  return new CanonStore(db);
}

async function askCmd(inv: Invocation): Promise<number> {
  const home = ensureDataDir(dataDir());
  return askCommand(inv.positionals[0], inv.values, { home, keyring: () => pickKeyring(keyringOptions(inv), home), store: memoryCanon(), out: (l) => console.log(l) });
}

async function llmCmd(inv: Invocation): Promise<number> {
  const home = ensureDataDir(dataDir());
  const fd = inv.values["key-fd"];
  return llmCommand(
    inv.command.name.slice(4),
    { positionals: inv.positionals, values: inv.values },
    {
      home,
      keyring: () => pickKeyring(keyringOptions(inv), home),
      readKey: async (label) => (typeof fd === "string" ? readPassphraseFd(Number(fd)) : promptPassphrase(label)),
      fetch,
      doctor: { fetch, exec: platformExec, now: Date.now, which: (b) => Bun.which(b) },
      out: (l) => console.log(l),
    },
  );
}
