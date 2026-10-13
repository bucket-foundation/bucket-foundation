import { CLI_COMMANDS, HELP_OPTION, optionsFor, VERSION_OPTION, type CommandSpec, type OptionSpec } from "./table";

export const SHELLS = ["bash", "zsh", "fish"] as const;
export type Shell = (typeof SHELLS)[number];

export function isShell(s: string): s is Shell {
  return (SHELLS as readonly string[]).includes(s);
}

interface Model {
  commands: CommandSpec[];
  first: { word: string; summary: string }[];
  families: { word: string; subs: { word: string; summary: string }[] }[];
  pairs: string[];
  global: Record<string, OptionSpec>;
}

function model(): Model {
  const commands = CLI_COMMANDS;
  const firstWords = [...new Set(commands.map((c) => c.name.split(" ")[0]))];
  const first = firstWords.map((word) => ({ word, summary: commands.find((c) => c.name === word)?.summary ?? `${word} commands` }));
  const families = firstWords
    .map((word) => ({ word, subs: commands.filter((c) => c.name.startsWith(`${word} `)).map((c) => ({ word: c.name.split(" ")[1], summary: c.summary })) }))
    .filter((f) => f.subs.length);
  return { commands, first, families, pairs: commands.filter((c) => c.name.includes(" ")).map((c) => c.name), global: { ...HELP_OPTION, ...VERSION_OPTION } };
}

const flags = (options: Record<string, OptionSpec>) => Object.entries(options).flatMap(([n, o]) => (o.short ? [`--${n}`, `-${o.short}`] : [`--${n}`]));

const single = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

function secondWords(m: Model, word: string): string[] {
  if (word === "help") return m.first.map((f) => f.word);
  if (word === "completion") return [...SHELLS];
  return m.families.find((f) => f.word === word)?.subs.map((s) => s.word) ?? [];
}

function bash(m: Model): string {
  const flagCases = m.commands.map((c) => `      ${single(c.name)}) COMPREPLY=($(compgen -W ${single(flags(optionsFor(c)).join(" "))} -- "$cur"));;`);
  const wordCases = ["help", "completion", ...m.families.map((f) => f.word)].map(
    (w) => `      ${w}) COMPREPLY=($(compgen -W ${single(secondWords(m, w).join(" "))} -- "$cur"));;`,
  );
  return [
    "_bkt() {",
    '  local cur="${COMP_WORDS[COMP_CWORD]}"',
    '  local first="${COMP_WORDS[1]}"',
    '  local second="${COMP_WORDS[2]}"',
    '  local cmd="$first"',
    '  case "$first $second" in',
    `    ${m.pairs.map(single).join("|")}) cmd="$first $second";;`,
    "  esac",
    "  COMPREPLY=()",
    '  if [[ "$cur" == -* ]]; then',
    '    case "$cmd" in',
    ...flagCases,
    `      *) COMPREPLY=($(compgen -W ${single(flags(m.global).join(" "))} -- "$cur"));;`,
    "    esac",
    "    return",
    "  fi",
    '  if [[ "$COMP_CWORD" -eq 1 ]]; then',
    `    COMPREPLY=($(compgen -W ${single(m.first.map((f) => f.word).join(" "))} -- "$cur"))`,
    "    return",
    "  fi",
    '  if [[ "$COMP_CWORD" -eq 2 ]]; then',
    '    case "$first" in',
    ...wordCases,
    "    esac",
    "  fi",
    "}",
    "complete -o default -F _bkt bkt",
  ].join("\n");
}

const zshItem = (word: string, summary: string) => single(`${word.replace(/:/g, "\\:")}:${summary.replace(/:/g, "\\:")}`);

function zsh(m: Model): string {
  const flagCases = m.commands.map((c) => {
    const items = Object.entries(optionsFor(c)).flatMap(([n, o]) => [zshItem(`--${n}`, o.help), ...(o.short ? [zshItem(`-${o.short}`, o.help)] : [])]);
    return `      (${single(c.name)}) items=(${items.join(" ")});;`;
  });
  const wordCases = ["help", "completion", ...m.families.map((f) => f.word)].map((w) => {
    const subs = m.families.find((f) => f.word === w)?.subs;
    const items = subs && w !== "help" ? subs.map((s) => zshItem(s.word, s.summary)) : secondWords(m, w).map(single);
    return `      (${w}) items=(${items.join(" ")});;`;
  });
  return [
    "#compdef bkt",
    "_bkt() {",
    "  local -a items",
    '  local cmd="${words[2]}"',
    '  case "${words[2]} ${words[3]}" in',
    `    (${m.pairs.map(single).join("|")}) cmd="\${words[2]} \${words[3]}";;`,
    "  esac",
    '  if [[ "${words[CURRENT]}" == -* ]]; then',
    '    case "$cmd" in',
    ...flagCases,
    `      (*) items=(${Object.entries(m.global).map(([n, o]) => zshItem(`--${n}`, o.help)).join(" ")});;`,
    "    esac",
    "    _describe 'option' items",
    "    return",
    "  fi",
    "  if (( CURRENT == 2 )); then",
    `    items=(${m.first.map((f) => zshItem(f.word, f.summary)).join(" ")})`,
    "    _describe 'command' items",
    "    return",
    "  fi",
    "  if (( CURRENT == 3 )); then",
    '    case "${words[2]}" in',
    ...wordCases,
    "      (*) _files; return;;",
    "    esac",
    "    _describe 'command' items",
    "    return",
    "  fi",
    "  _files",
    "}",
    "compdef _bkt bkt",
  ].join("\n");
}

function fish(m: Model): string {
  const at = (name: string) => `-n ${single(`test (__bkt_command) = ${single(name)}`)}`;
  const top = `-n ${single("test -z (__bkt_command)")}`;
  const flagLines = m.commands.flatMap((c) =>
    Object.entries(optionsFor(c)).map(
      ([n, o]) => `complete -c bkt ${at(c.name)} -l ${n}${o.short ? ` -s ${o.short}` : ""}${o.type === "string" ? " -r" : ""} -d ${single(o.help)}`,
    ),
  );
  const wordLines = ["help", "completion", ...m.families.map((f) => f.word)].flatMap((w) => {
    const subs = m.families.find((f) => f.word === w)?.subs;
    if (subs && w !== "help") return subs.map((s) => `complete -c bkt -f ${at(w)} -a ${single(s.word)} -d ${single(s.summary)}`);
    return [`complete -c bkt -f ${at(w)} -a ${single(secondWords(m, w).join(" "))}`];
  });
  return [
    "function __bkt_command",
    "  set -l seen",
    "  for t in (commandline -opc)[2..-1]",
    "    string match -q -- '-*' $t; or set -a seen $t",
    "  end",
    `  if test (count $seen) -ge 2; and contains -- "$seen[1] $seen[2]" ${m.pairs.map(single).join(" ")}`,
    '    echo "$seen[1] $seen[2]"',
    "  else if test (count $seen) -ge 1",
    "    echo $seen[1]",
    "  else",
    "    echo",
    "  end",
    "end",
    ...m.first.map((f) => `complete -c bkt -f ${top} -a ${single(f.word)} -d ${single(f.summary)}`),
    ...Object.entries(m.global).map(([n, o]) => `complete -c bkt ${top} -l ${n}${o.short ? ` -s ${o.short}` : ""} -d ${single(o.help)}`),
    ...wordLines,
    ...flagLines,
  ].join("\n");
}

export function completionScript(shell: Shell): string {
  const m = model();
  return shell === "bash" ? bash(m) : shell === "zsh" ? zsh(m) : fish(m);
}
