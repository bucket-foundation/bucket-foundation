#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import pack from "../content/pack.json" with { type: "json" };
import { join } from "node:path";
import { App } from "./app";
import { formLines, parseAnalyzeArgs, startAnalysis, type AnalysisResult, type AnalyzeOptions } from "./analyze";
import { AnalysisBrowser, AnalyzeRun } from "./analyze-view";
import type { Pack } from "./pack/export";
import { dataDir, ensureDataDir, openSession, parseArgs, pickKeyring } from "./setup";
import { loadBank, loadReview, loadScores } from "./hai/files";
import { HaiStore } from "./hai/store";
import { freeze, parseToolArgs, review, score } from "./hai/tools";
import { HaiApp } from "./hai/view";
import { IMPORT_BODY_BYTES, localRoutes } from "./local";
import { advisorRoutes, REVIEW_BODY_BYTES } from "./advisor";
import { PeopleStore } from "./people";
import { JOB_BODY_BYTES, jobRoutes } from "./job-routes";
import { jobSpecs } from "./job-specs";
import { JobRunner } from "./jobs";
import { parentGone } from "./parent";
import { BEADS_BODY_BYTES, WorkQuizStore, workQuizRoutes } from "./work-quiz";
import { NOTES_BODY_BYTES, NotesStore, notesRoutes } from "./notes";
import { HISTORY_BODY_BYTES, HistoryStore, historyRoutes } from "./history";
import { cacheRoot } from "./pyruntime";
import pysrc from "../content/pysrc.json" with { type: "json" };
import type { PySource } from "./pack/pysrc";
import { BUNDLED_ROS, rosRoutes } from "./ros";
import { startServe } from "./serve";
import { checkUpdate, describeUpdate } from "./update";
import { VERSION } from "./version";
import { openWindow, readApp, routeUrl, runtimeDir, splitRoute, takeRoute, uiDir, writeApp, writeRoute } from "./window";
import { quizCommand, writeQuizRoots } from "./notify";

const HAI_TOOLS = new Set(["freeze", "review", "score"]);

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

async function main(argv: string[]) {
  if (argv[0] === "--version" || argv[0] === "version") {
    console.log(VERSION);
    return;
  }
  if (argv[0] === "update") {
    if (argv.length > 2 || (argv[1] && argv[1] !== "--check")) throw new Error("usage: bkt update [--check]");
    const r = await checkUpdate();
    console.log(describeUpdate(r));
    if (r.status === "error") process.exitCode = 1;
    return;
  }
  if (argv[0] === "quiz") {
    process.exitCode = await quizCommand(argv.slice(1));
    return;
  }
  let route: string | null = null;
  if (argv[0] === "app") {
    ({ argv, route } = splitRoute(argv));
    const running = readApp(runtimeDir());
    if (running) {
      if (process.platform === "win32") {
        console.log(`Bucket is already running at ${routeUrl(`http://127.0.0.1:${running.port}/`, route)}`);
        return;
      }
      if (route !== null) writeRoute(runtimeDir(), route);
      process.kill(running.pid, "SIGUSR1");
      console.log(`reopened the Bucket window on port ${running.port}`);
      return;
    }
  }
  if (argv[0] === "analyze") {
    process.exitCode = await analyzeCmd(argv.slice(1));
    return;
  }
  if (argv[0] === "analyses") {
    await render(<AnalysisBrowser root={argv[1]} />).waitUntilExit();
    return;
  }
  if (argv[0] === "hai" && HAI_TOOLS.has(argv[1])) {
    const a = parseToolArgs(argv.slice(2));
    if (argv[1] === "freeze") freeze(pack as Pack, a);
    else if (argv[1] === "review") review(a);
    else await score(a);
    return;
  }
  const forgetPeople = argv[0] === "forget" && argv[1] === "people";
  if (argv[0] === "forget" && !forgetPeople) throw new Error("usage: bkt forget people");
  if (forgetPeople) argv = argv.slice(2);
  const hai = argv[0] === "hai";
  const haiCmd = hai ? (argv[1] && !argv[1].startsWith("--") ? argv[1] : "tui") : null;
  const { cmd, opts } = parseArgs(hai ? argv.slice(haiCmd === "tui" ? 1 : 2) : argv);
  const dir = ensureDataDir(dataDir());
  const session = await openSession(await pickKeyring(opts, dir), dir);
  const content = pack as Pack;
  const imported = session.store.importPack(content.version, content.items);
  try {
    if (haiCmd) {
      const h = new HaiStore(session.store, session.key);
      if (haiCmd === "wipe") {
        h.wipe();
        console.log("hai data deleted");
      } else if (haiCmd === "export") console.log(JSON.stringify(h.export(), null, 2));
      else if (haiCmd === "tui") await render(<HaiApp hai={h} data={{ bank: loadBank(), review: loadReview(), scores: loadScores() }} />).waitUntilExit();
      else throw new Error(`unknown hai command ${haiCmd}; try freeze, review, score, wipe, export`);
      return;
    }
    if (cmd === "init" || cmd === "whoami") {
      console.log(
        JSON.stringify(
          {
            device: session.device.id,
            publicKey: session.device.publicKey,
            newDevice: session.device.created,
            keyring: session.keyring.kind,
            pack: content.version,
            imported,
            journal: session.store.journalMode(),
          },
          null,
          2,
        ),
      );
      return;
    }
    if (forgetPeople) {
      const n = new PeopleStore(session.store, session.key).forget(Date.now());
      console.log(`forgot ${n} people; a later import skips them unless you confirm`);
      return;
    }
    if (cmd === "serve" || cmd === "app") {
      const people = new PeopleStore(session.store, session.key);
      const runner = new JobRunner({
        root: join(dir, "jobs"),
        specs: jobSpecs({ src: pysrc as PySource, cacheRoot: cacheRoot(), dataRoot: join(dir, "fit-me"), people }),
      });
      const workQuiz = new WorkQuizStore(session.store, session.key);
      writeQuizRoots(dir, workQuiz.chat());
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
      const show = (to: string | null) => (cmd === "app" ? openWindow(routeUrl(srv.url, to), profile) : console.log(srv.url));
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
      return;
    }
    if (cmd === "stats") {
      console.log(JSON.stringify(session.store.stats(Date.now())));
      return;
    }
    if (cmd !== "tui") throw new Error(`unknown command ${cmd}; try tui, init, whoami, stats, serve, app, analyze, analyses`);
    const ink = render(<App session={session} />);
    await ink.waitUntilExit();
  } finally {
    session.store.close();
  }
}

main(process.argv.slice(2)).catch((e) => {
  console.error(`bkt: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
