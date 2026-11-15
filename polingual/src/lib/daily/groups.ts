import { fnv, mixed, SeededRandom } from "./rng";
import { wordId, type GameWord } from "./words";

const GROUP_COUNT = 4;
const GROUP_SIZE = 4;
export const GROUP_MISTAKES = 4;
const LONGEST_FORM = 14;
const GROUP_THEMES = ["adjective", "animal", "body", "color", "family", "food", "nature", "number", "object", "time", "verb"];

export type GroupLink = { kind: "language"; lang: string } | { kind: "theme"; theme: string } | { kind: "languageTheme"; lang: string; theme: string };

interface WordGroup {
  link: GroupLink;
  words: GameWord[];
}

interface GroupsPuzzle {
  groups: WordGroup[];
  tiles: GameWord[];
}

export const groupId = (g: WordGroup) => g.words.map(wordId).sort().join(",");

const linkKey = (l: GroupLink) => (l.kind === "language" ? `l:${l.lang}` : l.kind === "theme" ? `t:${l.theme}` : `c:${l.lang}:${l.theme}`);
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function boardKey(day: string, root: string, targets: readonly string[]): string {
  return `${day}|${root}|${[...new Set(targets)].sort().join(",")}`;
}

type Partition = "language" | "theme" | "languageTheme";

export function dailyGroups(words: readonly GameWord[], day: string, root: string, targets: readonly string[], theme: (w: GameWord) => string | null, sameForm: (w: GameWord, lang: string) => boolean = () => false): GroupsPuzzle | null {
  const seed = `groups|${boardKey(day, root, targets)}`;
  const rng = new SeededRandom(fnv(seed));
  const pool = words
    .filter((w) => targets.includes(w.lang) && w.form.normalize("NFC").length <= LONGEST_FORM && !w.form.includes(" "))
    .map((w) => ({ order: fnv(`${seed}|${wordId(w)}`), w }))
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : cmp(wordId(a.w), wordId(b.w))))
    .map((x) => x.w);
  const distinct = pool.filter((w) => !targets.some((l) => l !== w.lang && sameForm(w, l)));
  for (const partition of mixed<Partition>(["language", "theme", "languageTheme"], rng)) {
    const groups = pick(partition === "theme" ? pool : distinct, partition, theme, rng);
    if (groups) return { groups, tiles: mixed(groups.flatMap((g) => g.words), rng) };
  }
  return null;
}

function link(w: GameWord, partition: Partition, theme: (w: GameWord) => string | null): GroupLink | null {
  if (partition === "language") return { kind: "language", lang: w.lang };
  const name = theme(w);
  if (!name || !GROUP_THEMES.includes(name)) return null;
  return partition === "theme" ? { kind: "theme", theme: name } : { kind: "languageTheme", lang: w.lang, theme: name };
}

function pick(words: readonly GameWord[], partition: Partition, theme: (w: GameWord) => string | null, rng: SeededRandom): WordGroup[] | null {
  const buckets = new Map<string, { link: GroupLink; words: GameWord[] }>();
  for (const w of words) {
    const l = link(w, partition, theme);
    if (!l) continue;
    const k = linkKey(l);
    if (!buckets.has(k)) buckets.set(k, { link: l, words: [] });
    buckets.get(k)!.words.push(w);
  }
  let forms = new Set<string>();
  const groups: WordGroup[] = [];
  const links = [...buckets.keys()].filter((k) => buckets.get(k)!.words.length >= GROUP_SIZE).sort(cmp);
  for (const k of mixed(links, rng)) {
    if (groups.length >= GROUP_COUNT) break;
    const taken: GameWord[] = [];
    const meanings = new Set<string>();
    const spelled = new Set(forms);
    for (const w of buckets.get(k)!.words) {
      if (taken.length >= GROUP_SIZE) break;
      if (meanings.has(w.itemId) || meanings.has(w.gloss.toLowerCase()) || spelled.has(w.form.toLowerCase())) continue;
      meanings.add(w.itemId);
      meanings.add(w.gloss.toLowerCase());
      spelled.add(w.form.toLowerCase());
      taken.push(w);
    }
    if (taken.length !== GROUP_SIZE) continue;
    forms = spelled;
    groups.push({ link: buckets.get(k)!.link, words: taken });
  }
  return groups.length === GROUP_COUNT ? groups : null;
}

type GroupsOutcome = "solved" | "oneAway" | "miss" | "repeated" | "ignored";

interface GroupsState {
  selected: string[];
  solved: string[];
  pattern: string;
  tried: string[];
}

export const emptyGroups = (): GroupsState => ({ selected: [], solved: [], pattern: "", tried: [] });

export function groupsMistakes(s: GroupsState): number {
  return [...s.pattern].filter((c) => c === "0").length;
}

export function groupsFinished(p: GroupsPuzzle, s: GroupsState): boolean {
  return s.solved.length === p.groups.length || groupsMistakes(s) >= GROUP_MISTAKES;
}

export function toggleTile(p: GroupsPuzzle, s: GroupsState, id: string): GroupsState {
  if (groupsFinished(p, s)) return s;
  if (s.selected.includes(id)) return { ...s, selected: s.selected.filter((x) => x !== id) };
  return s.selected.length < GROUP_SIZE ? { ...s, selected: [...s.selected, id] } : s;
}

export function submitGroup(p: GroupsPuzzle, s: GroupsState): [GroupsState, GroupsOutcome] {
  if (groupsFinished(p, s) || s.selected.length !== GROUP_SIZE) return [s, "ignored"];
  const key = [...s.selected].sort().join(",");
  if (s.tried.includes(key)) return [s, "repeated"];
  const tried = [...s.tried, key];
  const hit = p.groups.find((g) => groupId(g) === key);
  if (hit) return [{ selected: [], solved: [...s.solved, groupId(hit)], pattern: s.pattern + "1", tried }, "solved"];
  const best = Math.max(...p.groups.map((g) => g.words.filter((w) => s.selected.includes(wordId(w))).length));
  return [{ ...s, pattern: s.pattern + "0", tried }, best === GROUP_SIZE - 1 ? "oneAway" : "miss"];
}
