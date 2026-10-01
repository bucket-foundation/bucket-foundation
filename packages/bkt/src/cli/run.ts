import { parseArgs } from "node:util";
import { parseAnalyzeArgs } from "../analyze";
import { parseToolArgs } from "../hai/tools";
import { platformFor } from "../platform";
import type { KeyringOptions } from "../setup";
import { VERSION } from "../version";
import { isShell, SHELLS } from "./completion";
import { validDay } from "../daily-quiz";
import { interactive, type Tty } from "./out";
import {
  CLI_COMMANDS,
  commandHelp,
  DEFAULT_COMMAND,
  everyOption,
  EXIT,
  findCommand,
  generalHelp,
  optionsFor,
  usageLine,
  VERSION_OPTION,
  type CommandSpec,
  type OptionSpec,
} from "./table";

export class UsageError extends Error {
  constructor(
    message: string,
    readonly spec?: CommandSpec,
  ) {
    super(message);
  }
}

export class NoDataError extends Error {}

export class CancelledError extends Error {
  constructor() {
    super("cancelled");
  }
}

type Value = string | boolean | (string | boolean)[] | undefined;

export interface Invocation {
  command: CommandSpec;
  values: Record<string, Value>;
  positionals: string[];
  args: string[];
}

export type Resolved = { kind: "help"; text: string } | ({ kind: "run" } & Invocation);

const HAI_TOOLS = new Set(["hai freeze", "hai review", "hai score"]);

function nodeOptions(specs: Record<string, OptionSpec>) {
  return Object.fromEntries(
    Object.entries(specs).map(([name, o]) => [name, { type: o.type, ...(o.short ? { short: o.short } : {}), ...(o.multiple ? { multiple: true } : {}) }]),
  );
}

function family(word: string): string[] {
  return CLI_COMMANDS.filter((c) => c.name.startsWith(`${word} `)).map((c) => c.name.slice(word.length + 1));
}

function lookup(words: string[]): { spec: CommandSpec; used: number } {
  const [first, second] = words;
  const two = second !== undefined ? findCommand(`${first} ${second}`) : undefined;
  if (two) return { spec: two, used: 2 };
  const subs = family(first);
  if (subs.length && second !== undefined) throw new UsageError(`unknown ${first} command ${second}; try ${subs.join(", ")}`, findCommand(first));
  const one = findCommand(first);
  if (one) return { spec: one, used: 1 };
  if (subs.length) throw new UsageError(`${first} needs a subcommand: ${subs.join(", ")}`);
  throw new UsageError(`unknown command ${first}`);
}

function reason(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  const first = text.split(". ")[0].replace(/\.$/, "").replace(/'/g, "");
  return first.charAt(0).toLowerCase() + first.slice(1);
}

export function resolve(argv: string[]): Resolved {
  const scan = parseArgs({ args: argv, options: nodeOptions(everyOption()), strict: false, allowPositionals: true, tokens: true });
  const tokens = scan.tokens ?? [];
  const flagged = (name: string) => tokens.some((t) => t.kind === "option" && t.name === name);
  const words = tokens.filter((t) => t.kind === "positional");
  const wantsVersion = flagged("version");

  if (words[0]?.value === "help") {
    const target = words.slice(1).map((w) => w.value);
    if (!target.length) return { kind: "help", text: generalHelp(VERSION) };
    const found = lookup(target);
    if (found.used < target.length) throw new UsageError(`unexpected argument ${target[found.used]}`, findCommand("help"));
    return { kind: "help", text: commandHelp(found.spec) };
  }

  const found = words.length ? lookup(words.map((w) => w.value)) : { spec: findCommand(wantsVersion ? "version" : DEFAULT_COMMAND)!, used: 0 };
  const spec = found.spec;
  if (flagged("help")) return { kind: "help", text: words.length ? commandHelp(spec) : generalHelp(VERSION) };

  const used = new Set(words.slice(0, found.used).map((w) => w.index));
  const args = argv.filter((_, i) => !used.has(i));
  let parsed;
  try {
    parsed = parseArgs({
      args,
      options: nodeOptions({ ...optionsFor(spec), ...(spec.name === "version" ? VERSION_OPTION : {}) }),
      strict: true,
      allowPositionals: true,
    });
  } catch (e) {
    throw new UsageError(reason(e), spec);
  }
  const [min, max] = spec.positionals ?? [0, 0];
  if (parsed.positionals.length > max) throw new UsageError(`unexpected argument ${parsed.positionals[max]}`, spec);
  if (parsed.positionals.length < min) throw new UsageError(`${spec.name} needs ${spec.args}`, spec);

  const inv: Invocation = { command: spec, values: parsed.values as Record<string, Value>, positionals: parsed.positionals, args };
  try {
    if (spec.session) keyringOptions(inv);
    if (spec.name === "analyze") parseAnalyzeArgs(args);
    if (HAI_TOOLS.has(spec.name)) parseToolArgs(args);
    if (spec.options?.count) countOf(inv);
    if (spec.name === "daily" && parsed.positionals.length && !validDay(parsed.positionals[0])) throw new Error(`give the day as YYYY-MM-DD, such as 2026-10-01`);
    if (spec.name === "completion" && !isShell(parsed.positionals[0])) throw new Error(`unknown shell ${parsed.positionals[0]}; use ${SHELLS.join(", ")}`);
  } catch (e) {
    throw new UsageError(reason(e), spec);
  }
  return { kind: "run", ...inv };
}

export function countOf(inv: Pick<Invocation, "values">, fallback = 10): number {
  const raw = inv.values.count;
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (typeof raw !== "string" || !/^\d+$/.test(raw) || n < 1 || n > 50) throw new Error("--count needs a whole number from 1 to 50");
  return n;
}

export function keyringOptions(inv: Invocation): KeyringOptions {
  const opts: KeyringOptions = {};
  if (typeof inv.values.keyring === "string") opts.keyring = inv.values.keyring;
  const raw = inv.values["passphrase-fd"];
  if (typeof raw === "string") {
    const fd = Number(raw);
    if (raw.trim() === "" || !Number.isInteger(fd) || fd < 0) throw new Error("--passphrase-fd needs a file descriptor number");
    opts.passphraseFd = fd;
  }
  return opts;
}

export function preflight(inv: Invocation, env: Record<string, string | undefined>, tty: Tty, os: string = process.platform): void {
  const spec = inv.command;
  const screen = spec.terminal === "always" || (spec.terminal === "with-tui-flag" && inv.values.tui === true) || (spec.terminal === "without-json" && inv.values.json !== true);
  if (screen && !interactive(env, tty)) {
    const what = spec.name === DEFAULT_COMMAND ? "the terminal app" : `bkt ${spec.name}${inv.values.tui ? " --tui" : ""}`;
    throw new UsageError(`${what} needs a terminal`, spec);
  }
  if (!spec.session) return;
  const opts = keyringOptions(inv);
  const native = platformFor(os, { env }).nativeKeyring;
  const kind = opts.keyring ?? env.BKT_KEYRING ?? native;
  if (kind !== native && kind !== "native" && kind !== "passphrase") throw new UsageError(`unknown keyring ${kind}; use ${native} or passphrase`, spec);
  if (kind === "passphrase" && opts.passphraseFd === undefined && !tty.stdin) throw new UsageError("the passphrase keyring needs a terminal or --passphrase-fd N", spec);
}

export function describeFailure(e: unknown): { code: number; lines: string[] } {
  const message = e instanceof Error ? e.message : String(e);
  if (e instanceof UsageError) {
    const spec = e.spec;
    const more = spec && spec.name !== DEFAULT_COMMAND ? `run bkt help ${spec.name} for its options` : "run bkt help for the command list";
    return { code: EXIT.usage, lines: [`bkt: ${message}`, spec ? usageLine(spec) : "usage: bkt [command] [options]", more] };
  }
  if (e instanceof NoDataError) return { code: EXIT.noData, lines: [`bkt: ${message}`] };
  if (e instanceof CancelledError) return { code: EXIT.cancelled, lines: ["bkt: cancelled"] };
  return { code: EXIT.failure, lines: [`bkt: ${message}`] };
}
