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
  if (argv[0] === "analyze") {
    process.exitCode = await analyzeCmd(argv.slice(1));
    return;
  }
  if (argv[0] === "analyses") {
    await render(<AnalysisBrowser root={argv[1]} />).waitUntilExit();
    return;
  }
  const { cmd, opts } = parseArgs(argv);
  const dir = ensureDataDir(dataDir());
  const session = await openSession(await pickKeyring(opts, dir), dir);
  const content = pack as Pack;
  const imported = session.store.importPack(content.version, content.items);
  try {
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
    if (cmd === "stats") {
      console.log(JSON.stringify(session.store.stats(Date.now())));
      return;
    }
    if (cmd !== "tui") throw new Error(`unknown command ${cmd}; try tui, init, whoami, stats, analyze, analyses`);
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
