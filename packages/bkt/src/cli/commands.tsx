import React from "react";
import { render } from "ink";
import pack from "../../content/pack.json" with { type: "json" };
import { join } from "node:path";
import { App } from "../app";
import { formLines, listAnalyses, parseAnalyzeArgs, startAnalysis, type AnalysisResult, type AnalyzeOptions } from "../analyze";
import { AnalysisBrowser, AnalyzeRun } from "../analyze-view";
import type { Pack } from "../pack/export";
import { dataDir, ensureDataDir, openSession, pickKeyring, type Session } from "../setup";
import { loadBank, loadReview, loadScores } from "../hai/files";
import { HaiStore } from "../hai/store";
import { freeze, parseToolArgs, review, score } from "../hai/tools";
import { interactive, jsonLine, textRows } from "./out";
import { keyringOptions, NoDataError, type Invocation, UsageError } from "./run";
import { EXIT } from "./table";
import { HaiApp } from "../hai/view";
import { IMPORT_BODY_BYTES, localRoutes } from "../local";
import { advisorRoutes, REVIEW_BODY_BYTES } from "../advisor";
import { PeopleStore } from "../people";
import { JOB_BODY_BYTES, jobRoutes } from "../job-routes";
import { jobSpecs } from "../job-specs";
import { JobRunner } from "../jobs";
import { parentGone } from "../parent";
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
import { checkRoute, openWindow, readApp, RouteError, routeUrl, runtimeDir, takeRoute, uiDir, writeApp, writeRoute } from "../window";
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
  if (o.json) console.log(JSON.stringify(report, null, 2));
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

async function serve(name: "serve" | "app", session: Session, dir: string, content: Pack, route: string | null): Promise<void> {
  const workQuiz = new WorkQuizStore(session.store, session.key);
  writeQuizRoots(dir, workQuiz.chat());
  const people = new PeopleStore(session.store, session.key);
  const runner = new JobRunner({
    root: join(dir, "jobs"),
    specs: jobSpecs({ src: pysrc as PySource, cacheRoot: cacheRoot(), dataRoot: join(dir, "fit-me"), people }),
  });
  const srv = startServe({
    routes: {
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
    },
    uiDir: uiDir(),
    onError: (e) => console.error(`bkt serve: ${e.message}`),
  });
  const release = writeApp(runtimeDir(), { pid: process.pid, port: srv.port });
  const profile = join(dir, "window-profile");
  const show = (to: string | null) => (name === "app" ? openWindow(routeUrl(srv.url, to), profile) : console.log(srv.url));
  const reopen = () => {
    srv.remint();
    show(takeRoute(runtimeDir()));
  };
  if (process.platform !== "win32") process.on("SIGUSR1", reopen);
  show(route);
  await new Promise<void>((done) => {
    process.once("SIGINT", done);
    process.once("SIGTERM", done);
    void parentGone(process.env, () => Bun.stdin.stream()).then(() => {
      console.error("bkt serve: the Bucket window process is gone; stopping");
      done();
    });
  });
  process.off("SIGUSR1", reopen);
  runner.stopAll();
  release();
  srv.stop();
}

function reopenRunningApp(route: string | null): boolean {
  const running = readApp(runtimeDir());
  if (!running) return false;
  if (process.platform === "win32") {
    console.log(`Bucket is already running at ${routeUrl(`http://127.0.0.1:${running.port}/`, route)}`);
    return true;
  }
  if (route !== null) writeRoute(runtimeDir(), route);
  process.kill(running.pid, "SIGUSR1");
  console.log(`reopened the Bucket window on port ${running.port}`);
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
  if (json) console.log(jsonLine({ analyses: items }));
  else for (const a of items) console.log(`${a.name}\t${a.dir}`);
  if (!items.length) throw new NoDataError("no saved analyses; run bkt analyze <file>");
  return EXIT.ok;
}

export async function execute(inv: Invocation): Promise<number> {
  const name = inv.command.name;
  const json = inv.values.json === true;
  if (name === "version") {
    console.log(json ? jsonLine({ version: VERSION }) : VERSION);
    return EXIT.ok;
  }
  if (name === "update") {
    const r = await checkUpdate();
    console.log(json ? jsonLine({ ...r }) : describeUpdate(r));
    return r.status === "error" ? EXIT.failure : EXIT.ok;
  }
  if (name === "quiz notify") return quizCommand(["notify", ...(inv.values.force === true ? ["--force"] : [])]);
  if (name === "quiz schedule") return quizCommand(["schedule", ...(typeof inv.values.at === "string" ? ["--at", inv.values.at] : [])]);
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

  const dir = ensureDataDir(dataDir());
  const session = await openSession(await pickKeyring(keyringOptions(inv), dir), dir);
  const content = pack as Pack;
  const imported = session.store.importPack(content.version, content.items);
  try {
    if (name === "hai wipe") {
      new HaiStore(session.store, session.key).wipe();
      console.log("hai data deleted");
    } else if (name === "hai export") console.log(JSON.stringify(new HaiStore(session.store, session.key).export(), null, 2));
    else if (name === "hai") {
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
      if (json) console.log(jsonLine(who));
      else if (name === "init") console.log(JSON.stringify(who, null, 2));
      else console.log(textRows(Object.entries(who)));
    } else if (name === "forget people") {
      const n = new PeopleStore(session.store, session.key).forget(Date.now());
      console.log(`forgot ${n} people; a later import skips them unless you confirm`);
    } else if (name === "serve" || name === "app") await serve(name, session, dir, content, route);
    else if (name === "stats") {
      const s = session.store.stats(Date.now());
      console.log(json ? jsonLine(s) : textRows(Object.entries(s)));
    } else await render(<App session={session} />).waitUntilExit();
    return EXIT.ok;
  } finally {
    session.store.close();
  }
}
