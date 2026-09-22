/**
 * The daily AI watch's ledger from a shell (ros-ai-watch). The scheduled
 * watch writes through `add`, so every line is checked and deduplicated
 * before it lands; the other commands read.
 *
 *   npm run ai-watch -- add < line.json        append one item or run line
 *   npm run ai-watch -- check                  every contract problem in the ledger
 *   npm run ai-watch -- report [--since DATE]  what changed; first line NOTIFY or QUIET
 *   npm run ai-watch -- select --milestone M --item KEY --replaces ARM --by NAME
 *
 * The ledger is operator-local: AI_WATCH_LEDGER, or
 * ~/.local/share/bucket/ai-watch/ledger.jsonl. It holds no secrets and no
 * personal data, and it stays off the repository.
 *
 * Exit 0: done. Exit 1: a refused line or a ledger with problems. Exit 2:
 * the command could not run.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { isDuplicate, itemKey, lineProblems, readLedger, report, type Line, type SelectionLine } from "./ledger";

function flag(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? null);
}

function ledgerPath(args: string[]): string {
  return path.resolve(flag(args, "--ledger") ?? process.env.AI_WATCH_LEDGER ?? path.join(homedir(), ".local", "share", "bucket", "ai-watch", "ledger.jsonl"));
}

function load(file: string) {
  return readLedger(existsSync(file) ? readFileSync(file, "utf8") : "");
}

function append(file: string, line: Line) {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(line)}\n`);
}

function main(argv: string[]): number {
  const [cmd, ...args] = argv;
  const file = ledgerPath(args);

  if (cmd === "add") {
    let line: Line;
    try {
      line = JSON.parse(readFileSync(0, "utf8")) as Line;
    } catch {
      console.error("[ai-watch] stdin is not one JSON line");
      return 1;
    }
    if (line.kind === "selection") {
      console.error("[ai-watch] a selection goes through `select`");
      return 1;
    }
    const bad = lineProblems(line);
    if (bad.length) {
      for (const b of bad) console.error(`  [refused] ${b}`);
      return 1;
    }
    const ledger = load(file);
    if (line.kind === "item" && isDuplicate(ledger, line)) {
      console.log(`[ai-watch] ${itemKey(line)} is already assessed this way; nothing added`);
      return 0;
    }
    append(file, line);
    const tag = line.kind === "item" ? `${itemKey(line)} ${line.disposition}` : `run ${line.runAt}`;
    console.log(`[ai-watch] added ${tag}`);
    return 0;
  }

  if (cmd === "check") {
    const ledger = load(file);
    for (const p of ledger.problems) console.log(`  [problem] ${p}`);
    console.log(`[ai-watch] ${file}: ${ledger.items.size} items, ${ledger.runs.length} runs, ${ledger.selections.length} selections, ${ledger.problems.length} problems`);
    return ledger.problems.length ? 1 : 0;
  }

  if (cmd === "report") {
    const now = flag(args, "--now") ?? new Date().toISOString();
    const since = flag(args, "--since") ?? new Date(Date.parse(now) - 24 * 3600 * 1000).toISOString();
    const r = report(load(file), since, now);
    console.log(r.notify ? "NOTIFY" : "QUIET");
    for (const reason of r.reasons) console.log(`- ${reason}`);
    if (r.lastRun) console.log(`Last run ${r.lastRun.runAt}: ${r.lastRun.sourcesChecked.length} sources, ${r.lastRun.failures.length} failures, ${r.lastRun.candidates} candidates, ${r.lastRun.deepReads} deep reads.`);
    for (const i of r.newSince) console.log(`- ${i.disposition}: ${i.title} (${i.component}, ${i.evidenceLevel}) ${i.sourceUrl}`);
    for (const p of r.openProposals) console.log(`- open proposal ${p.key}: ${p.title} (${p.component})`);
    return 0;
  }

  if (cmd === "select") {
    const line: SelectionLine = {
      kind: "selection",
      milestone: flag(args, "--milestone") ?? "",
      itemKey: flag(args, "--item") ?? "",
      replaces: flag(args, "--replaces") ?? "",
      selectedBy: flag(args, "--by") ?? "",
      selectedAt: new Date().toISOString(),
    };
    const bad = lineProblems(line);
    const ledger = load(file);
    if (ledger.selections.some((s) => s.milestone === line.milestone)) bad.push(`milestone ${line.milestone} already has its one selection`);
    const item = ledger.items.get(line.itemKey);
    if (!item) bad.push(`no item ${line.itemKey} in the ledger`);
    else if (item.current.disposition !== "propose-amendment") bad.push(`item ${line.itemKey} is ${item.current.disposition}, and a milestone selects a proposed amendment`);
    if (bad.length) {
      for (const b of bad) console.error(`  [refused] ${b}`);
      return 1;
    }
    append(file, line);
    console.log(`[ai-watch] ${line.milestone}: ${line.itemKey} replaces ${line.replaces}`);
    return 0;
  }

  console.error("usage: ai-watch add | check | report [--since DATE] | select --milestone M --item KEY --replaces ARM --by NAME  [--ledger PATH]");
  return 2;
}

process.exit(main(process.argv.slice(2)));
