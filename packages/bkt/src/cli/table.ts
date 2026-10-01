export interface OptionSpec {
  type: "boolean" | "string";
  short?: string;
  multiple?: boolean;
  value?: string;
  help: string;
}

export type PaletteTarget = "quiz" | "review" | "stats" | "home" | "help" | "quit";

export interface CommandSpec {
  name: string;
  summary: string;
  args?: string;
  positionals?: [number, number];
  options?: Record<string, OptionSpec>;
  session?: boolean;
  json?: boolean;
  terminal?: "always" | "with-tui-flag";
  palette?: { run: PaletteTarget; hint: string; order: number };
  tuiOnly?: boolean;
}

export const EXIT = { ok: 0, failure: 1, usage: 2, noData: 3, cancelled: 130 } as const;

export const DEFAULT_COMMAND = "tui";

export const HELP_OPTION: Record<string, OptionSpec> = {
  help: { type: "boolean", short: "h", help: "show help and exit" },
};

export const VERSION_OPTION: Record<string, OptionSpec> = {
  version: { type: "boolean", help: "print the version and exit" },
};

export const JSON_OPTION: Record<string, OptionSpec> = {
  json: { type: "boolean", help: 'print one line of JSON shaped {"v":1,...}' },
};

export const KEYRING_OPTIONS: Record<string, OptionSpec> = {
  keyring: { type: "string", value: "KIND", help: "key store: native or passphrase" },
  "passphrase-fd": { type: "string", value: "N", help: "read the vault passphrase from file descriptor N" },
};

const HAI_TOOL_OPTIONS: Record<string, OptionSpec> = {
  dir: { type: "string", value: "DIR", help: "folder that holds the hai files" },
};

export const TABLE: CommandSpec[] = [
  { name: "tui", summary: "open the terminal app; bkt with no command does the same", session: true, terminal: "always" },
  { name: "quiz", summary: "timed multiple choice", tuiOnly: true, palette: { run: "quiz", hint: "timed multiple choice", order: 1 } },
  { name: "review", summary: "due cards, self rated", tuiOnly: true, palette: { run: "review", hint: "due cards, self rated", order: 2 } },
  { name: "init", summary: "create the device key, data key and database", session: true, json: true },
  { name: "whoami", summary: "print this device and its key store", session: true, json: true },
  {
    name: "stats",
    summary: "print item, seen, due and attempt counts",
    session: true,
    json: true,
    palette: { run: "stats", hint: "counts and device", order: 3 },
  },
  { name: "home", summary: "main menu", tuiOnly: true, palette: { run: "home", hint: "main menu", order: 4 } },
  { name: "serve", summary: "start the local server and print its URL", session: true },
  {
    name: "app",
    summary: "start the local server and open the Bucket window",
    session: true,
    options: { route: { type: "string", value: "PATH", help: "open the window on a view, such as /work/daily/2026-09-30" } },
  },
  { name: "quiz notify", summary: "send the daily quiz notification when a chat source changed", options: { force: { type: "boolean", help: "send even when today's notification went out" } } },
  { name: "quiz schedule", summary: "run the daily quiz notification once a day; Linux only", options: { at: { type: "string", value: "HH:MM", help: "time of day, 08:53 when omitted" } } },
  { name: "quiz unschedule", summary: "remove the daily quiz notification timer" },
  {
    name: "analyze",
    summary: "check a data file, run the analysis suite and save a report",
    args: "<file>",
    positionals: [1, 1],
    terminal: "with-tui-flag",
    options: {
      force: { type: "boolean", help: "analyze even when the form check fails" },
      "no-helix": { type: "boolean", help: "skip the helix run" },
      name: { type: "string", value: "NAME", help: "report name" },
      horizon: { type: "string", value: "N", help: "forecast horizon, a whole number" },
      "max-rows": { type: "string", value: "N", help: "stop reading after N rows" },
      out: { type: "string", value: "DIR", help: "report folder" },
      json: { type: "boolean", help: "print the report as JSON" },
      tui: { type: "boolean", help: "show progress and the report in the terminal app" },
      dev: { type: "boolean", help: "use the analyzer from the checkout" },
    },
  },
  { name: "analyses", summary: "list saved analyses; in a terminal, browse them", args: "[dir]", positionals: [0, 1], json: true },
  { name: "hai", summary: "open the human and AI probe", session: true, terminal: "always" },
  { name: "hai freeze", summary: "write the frozen item bank", options: HAI_TOOL_OPTIONS },
  {
    name: "hai review",
    summary: "flag weak items in the bank",
    options: { ...HAI_TOOL_OPTIONS, clear: { type: "string", multiple: true, value: "ID", help: "clear a flagged item; repeat for more" } },
  },
  {
    name: "hai score",
    summary: "estimate, submit or collect the AI scoring batch",
    options: {
      ...HAI_TOOL_OPTIONS,
      pilot: { type: "string", value: "N", help: "score N items" },
      yes: { type: "boolean", help: "submit the batch" },
      "dry-run": { type: "boolean", help: "print the estimate and stop" },
      collect: { type: "boolean", help: "collect a finished batch" },
      "max-usd": { type: "string", value: "USD", help: "refuse a batch whose worst case costs more" },
    },
  },
  { name: "hai export", summary: "print the probe data as JSON", session: true },
  { name: "hai wipe", summary: "delete the probe data", session: true },
  { name: "forget people", summary: "forget imported people", session: true },
  {
    name: "update",
    summary: "check for a newer signed release",
    json: true,
    options: { check: { type: "boolean", help: "check only; this is the default" } },
  },
  { name: "version", summary: "print the version", json: true },
  {
    name: "help",
    summary: "show help for bkt or one command",
    args: "[command]",
    positionals: [0, 2],
    palette: { run: "help", hint: "key bindings", order: 5 },
  },
  { name: "quit", summary: "exit bkt", tuiOnly: true, palette: { run: "quit", hint: "exit bkt", order: 6 } },
];

export const CLI_COMMANDS = TABLE.filter((c) => !c.tuiOnly);

export function findCommand(name: string): CommandSpec | undefined {
  return CLI_COMMANDS.find((c) => c.name === name);
}

export function optionsFor(spec: CommandSpec): Record<string, OptionSpec> {
  return { ...spec.options, ...(spec.json ? JSON_OPTION : {}), ...(spec.session ? KEYRING_OPTIONS : {}), ...HELP_OPTION };
}

export function everyOption(): Record<string, OptionSpec> {
  return Object.assign({}, VERSION_OPTION, ...CLI_COMMANDS.map(optionsFor));
}

export function paletteEntries(): { name: string; run: PaletteTarget; hint: string }[] {
  return TABLE.filter((c) => c.palette)
    .sort((a, b) => a.palette!.order - b.palette!.order)
    .map((c) => ({ name: c.name, run: c.palette!.run, hint: c.palette!.hint }));
}

function flagLabel(name: string, o: OptionSpec): string {
  return `${o.short ? `-${o.short}, ` : ""}--${name}${o.type === "string" ? ` ${o.value ?? "VALUE"}` : ""}`;
}

function rows(pairs: [string, string][]): string[] {
  const width = Math.max(...pairs.map(([a]) => a.length));
  return pairs.map(([a, b]) => `  ${a.padEnd(width)}  ${b}`);
}

export function usageLine(spec: CommandSpec): string {
  const name = spec.name === DEFAULT_COMMAND ? "" : ` ${spec.name}`;
  return `usage: bkt${name}${spec.args ? ` ${spec.args}` : ""} [options]`;
}

export function commandHelp(spec: CommandSpec): string {
  const options = Object.entries(optionsFor(spec)).map(([n, o]): [string, string] => [flagLabel(n, o), o.help]);
  return [usageLine(spec), "", spec.summary, "", "options:", ...rows(options)].join("\n");
}

export function generalHelp(version: string): string {
  const commands = CLI_COMMANDS.map((c): [string, string] => [`${c.name}${c.args ? ` ${c.args}` : ""}`, c.summary]);
  const options = Object.entries({ ...HELP_OPTION, ...VERSION_OPTION, ...JSON_OPTION, ...KEYRING_OPTIONS }).map(([n, o]): [string, string] => [flagLabel(n, o), o.help]);
  return [
    `bkt ${version}, the Bucket terminal app`,
    "",
    "usage: bkt [command] [options]",
    "       bkt help <command>",
    "",
    "commands:",
    ...rows(commands),
    "",
    "options:",
    ...rows(options),
    "",
    "exit codes: 0 ok, 1 failure, 2 usage, 3 no data, 130 cancelled",
    "NO_COLOR turns colour off. The terminal app needs a terminal; without one bkt prints usage and exits 2.",
  ].join("\n");
}
