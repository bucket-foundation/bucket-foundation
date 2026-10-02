import React from "react";
import { render } from "ink";
import pack from "../../content/pack.json" with { type: "json" };
import canonPack from "../../content/canon.json" with { type: "json" };
import explorePack from "../../content/explore.json" with { type: "json" };
import { join } from "node:path";
import { App, type AppSources } from "../app";
import { spawn } from "node:child_process";
import { formLines, listAnalyses, parseAnalyzeArgs, startAnalysis, type AnalysisResult, type AnalyzeOptions } from "../analyze";
import { AnalysisBrowser, AnalyzeRun } from "../analyze-view";
import type { Pack, PackDeck } from "../pack/export";
import { dataDir, ensureDataDir, openSession, pickKeyring, type Session } from "../setup";
import { loadBank, loadReview, loadScores } from "../hai/files";
import { HaiStore } from "../hai/store";
import { freeze, parseToolArgs, review, score } from "../hai/tools";
import { analysisRows, interactive, JSON_SHAPES, jsonLine, pick, statRows, textRows, whoRows } from "./out";
import { countOf, keyringOptions, NoDataError, searchOptions, type Invocation, UsageError } from "./run";
import { directBackend, findServer, writeServerRecord, type LearnBackend } from "../core/backend";
import { daily, learnDue, learnPath, quizJson, reviewJson, screen } from "./learn";
import { localDay } from "../chat-sources";
import { randomBytes } from "node:crypto";
import { excerptText, packCanon, parseId, searchCanon, searchParams, searchText, searchTsv, showExcerpt } from "../core/search";
import { EXIT } from "./table";
import { HaiApp } from "../hai/view";
import { doctorLines, doctorPassed, runDoctor } from "../doctor";
import { execSync, platformFor } from "../platform";
import { completionScript, isShell } from "./completion";
import { reportRows, reportSentences } from "../hai/report-text";
import { report } from "../hai/session";
import { IMPORT_BODY_BYTES, localRoutes } from "../local";
import { canonRoutes, CanonStore, OPEN_BODY_BYTES, syncCanon } from "../canon";
import { exploreRoutes, ExploreStore, syncExplore } from "../explore";
import type { CanonPack } from "../pack/canon";
import { canonAdapter, dataRoutes, exploreAdapter, learningAdapter, ownAdapter } from "../data";
import type { ExplorePack } from "../pack/explore";
import { advisorRoutes, REVIEW_BODY_BYTES } from "../advisor";
import { PeopleStore } from "../people";
import { JOB_BODY_BYTES, jobRoutes } from "../job-routes";
import { jobSpecs } from "../job-specs";
import { JobRunner } from "../jobs";
import { isSidecar, parentGone } from "../parent";
import { BEADS_BODY_BYTES, WorkQuizStore, workQuizRoutes } from "../work-quiz";
import { NOTES_BODY_BYTES, NotesStore, notesRoutes } from "../notes";
import { HISTORY_BODY_BYTES, HistoryStore, historyRoutes } from "../history";
import { cacheRoot } from "../pyruntime";
import pysrc from "../../content/pysrc.json" with { type: "json" };
import type { PySource } from "../pack/pysrc";
import { BUNDLED_ROS, rosRoutes } from "../ros";
import { startServe } from "../serve";
import { checkUpdate, describeUpdate } from "../update";
import { VERSION } from "../version";
import { AppWindow, askRunningApp, checkRoute, processTable, readApp, requestReopen, RouteError, routeUrl, runtimeDir, ROUTE_WAIT_MS, takeReopen, takeRoute, uiDir, windowRoutes, writeApp, writeRoute } from "../window";
import { quizCommand, writeQuizRoots } from "../notify";

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

const LEARN = new Set(["learn due", "learn path", "learn quiz", "learn review", "daily"]);

async function learn(inv: Invocation, json: boolean): Promise<number> {
  const name = inv.command.name;
  const content = pack as Pack;
  let deck: PackDeck | null = null;
  if (name === "learn path" && inv.positionals[0] !== undefined) {
    deck = (content.decks ?? []).find((d) => d.id === inv.positionals[0]) ?? null;
    if (!deck) throw new UsageError(`unknown deck ${inv.positionals[0]}; run bkt learn path for the list`, inv.command);
  }
  const size = countOf(inv);
  const day = inv.positionals[0] ?? localDay(Date.now());
  const run = (b: LearnBackend) => {
    if (name === "learn due") return learnDue(b, size, json);
    if (name === "learn path") return learnPath(b, deck, deck ? (content.atoms?.[deck.id] ?? []) : [], json);
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
    return await run(directBackend({ store: session.store, content, daily: wq.daily, record: (...a) => wq.record(...a) }));
  } finally {
    session.store.close();
  }
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
  const canon = new CanonStore(session.store.db);
  const explore = new ExploreStore(session.store.db);
  const cliToken = randomBytes(32).toString("base64url");
  const cliSecret = randomBytes(32).toString("base64url");
  const win = new AppWindow(runtimeDir(), join(dir, "window-profile"));
  const data = dataRoutes([
    learningAdapter(content),
    canonAdapter(canonPack as CanonPack),
    exploreAdapter(explorePack as unknown as ExplorePack),
    ownAdapter(session.store, { analyses: () => runner.list().length }),
  ]);
  const srv = startServe({
    cliToken,
    cliSecret,
    match: data.match,
    routes: {
      ...windowRoutes(win.routes),
      ...data.routes,
      ...canonRoutes(canon, { holdsDoi: (doi) => explore.hasPrimaryPaper(doi) }),
      ...exploreRoutes(explore, canon),
      ...localRoutes(session.store, { content }),
      ...rosRoutes(BUNDLED_ROS, (e) => console.error(`bkt serve: ${e.message}`)),
      ...advisorRoutes(people),
      ...jobRoutes(runner),
      ...workQuizRoutes(workQuiz, { onChat: (on) => writeQuizRoots(dir, on) }),
      ...notesRoutes(new NotesStore(session.store, session.key)),
      ...historyRoutes(new HistoryStore(session.store, session.key)),
    },
    routeBodyBytes: {
      "POST /local/import": IMPORT_BODY_BYTES,
      "POST /local/advisor/import": REVIEW_BODY_BYTES,
      "POST /local/prime-directions/import": REVIEW_BODY_BYTES,
      "POST /local/jobs": JOB_BODY_BYTES,
      "POST /local/work-quiz/beads": BEADS_BODY_BYTES,
      "POST /local/notes": NOTES_BODY_BYTES,
      "POST /local/history/import": HISTORY_BODY_BYTES,
      "POST /local/open": OPEN_BODY_BYTES,
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
    void parentGone(process.env, () => Bun.stdin.stream()).then(() => {
      console.error("bkt serve: the Bucket window process is gone; stopping");
      done();
    });
    if (name === "app") void win.closed(() => runner.busy()).then(done);
  });
  process.off("SIGUSR1", reopen);
  clearInterval(asked);
  win.forget();
  runner.stopAll();
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

function search(inv: Invocation, json: boolean): number {
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
  const graph = (canonPack as { graph?: { nodes?: unknown[]; edges?: unknown[] } }).graph;
  return {
    canon: packCanon(canonPack as CanonPack),
    graph: graph ? { nodes: graph.nodes?.length ?? 0, edges: graph.edges?.length ?? 0 } : null,
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

export async function execute(inv: Invocation): Promise<number> {
  const name = inv.command.name;
  const json = inv.values.json === true;
  if (name === "version") {
    console.log(json ? jsonLine("version", { version: VERSION }) : VERSION);
    return EXIT.ok;
  }
  if (name === "update") {
    const r = await checkUpdate();
    console.log(json ? jsonLine("update", r) : describeUpdate(r));
    return r.status === "error" ? EXIT.failure : EXIT.ok;
  }
  if (name === "quiz notify") return quizCommand(["notify", ...(inv.values.force === true ? ["--force"] : [])]);
  if (name === "quiz schedule") return quizCommand(["schedule", ...(typeof inv.values.at === "string" ? ["--at", inv.values.at] : []), ...(inv.values.force === true ? ["--force"] : [])]);
  if (name === "quiz unschedule") return quizCommand(["unschedule"]);
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
  if (name === "search") return search(inv, json);
  if (name === "canon show") return canonShow(inv, json);
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
    } else if (name === "serve" || name === "app") await serve(name, session, dir, content, route);
    else if (name === "stats") {
      const s = session.store.stats(Date.now());
      console.log(json ? jsonLine("stats", s) : textRows(statRows(s)));
    } else await render(<App session={session} sources={tuiSources(session)} />).waitUntilExit();
    return EXIT.ok;
  } finally {
    session.store.close();
  }
}
