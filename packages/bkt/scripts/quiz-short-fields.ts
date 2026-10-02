import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkLimits, countTokens, LIMITS, longestToken } from "../../../src/lib/research-os/work-quiz/limits";
import type { Item } from "../src/grade";
import { itemsFromCorpus } from "../src/pack/export";
import { buildShortQuestion, normShort, type ShortField, type ShortFile } from "../src/short-fields";

const ROOT = resolve(import.meta.dir, "../../..");
const CORPUS = join(ROOT, "learning/app/corpus");
const OUT = join(ROOT, "learning/app/short-fields.json");
const MODEL_FILE = join(ROOT, "learning/app/short-fields-model.json");
const SAMPLE = join(ROOT, "learning/app/REVIEW-SAMPLE.md");
const LLM = process.env.BKT_LLM_URL ?? "http://127.0.0.1:11435";
const SAMPLE_SIZE = 100;
const SEEDS = ["a", "b", "c", "d", "e"];

const STOP = new Set(["a", "an", "the", "of", "in", "on", "at", "to", "for", "from", "by", "with", "as", "and", "or", "but", "so", "it", "its", "this", "that", "these", "those", "is", "are", "was", "were", "be", "because", "which", "when", "where", "while", "not", "no", "yes", "than", "then", "if", "they", "their", "there", "into", "only", "also", "each", "per", "one", "within", "after", "before", "during", "about", "without", "under", "over", "between", "through", "both", "all", "any", "some", "more", "most", "less", "via", "here", "we", "you", "i", "e.g", "i.e", "hence", "thus", "therefore", "giving", "using"]);
const PREP = new Set(["at", "in", "on", "by", "for", "from", "to", "with", "within", "after", "before", "during", "under", "over", "between", "through", "without", "if", "when", "while", "because", "since", "so", "and", "or", "but", "hence", "thus", "therefore", "giving", "using", "minimizing", "reverse"]);
const VERBS = new Set(["is", "are", "was", "were", "makes", "make", "made", "determine", "determines", "has", "have", "had", "consumes", "means", "gives", "give", "shows", "show", "lets", "let", "allows", "allow", "can", "cannot", "will", "would", "must", "should", "does", "do", "did", "becomes", "become", "requires", "require", "produces", "produce", "causes", "cause", "sets", "set", "drives", "drive", "says", "states", "holds", "keeps", "takes", "uses", "use", "depends", "so", "because", "which", "that", "since", "while", "when", "where", "who"]);

const bare = (t: string) => t.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
const trimEdge = (s: string) => {
  let t = s.trim().replace(/^[\s,;:“"'‘]+|[\s,;:.”"'’!?]+$/g, "").trim();
  while (/^[([]/.test(t) && !balanced(t)) t = t.slice(1).trim();
  while (/[)\]]$/.test(t) && !balanced(t)) t = t.slice(0, -1).trim();
  return t.replace(/[\s,;:.!?]+$/, "");
};
const hasContent = (s: string) => s.split(/\s+/).some((w) => bare(w).length >= 2 && !STOP.has(bare(w))) || /\d/.test(s);

function dropTrailingStop(words: string[]): string[] {
  const out = words.slice();
  while (out.length && (STOP.has(bare(out[out.length - 1])) || VERBS.has(bare(out[out.length - 1])))) out.pop();
  while (out.length && STOP.has(bare(out[0])) && out.length > 1 && ["so", "and", "or", "but", "because", "which", "that", "it"].includes(bare(out[0]))) out.shift();
  return out;
}

const UNIT = "%|°C|K|eV|keV|MeV|GeV|nm|µm|mm|cm|m|km|ms|µs|ns|s|mV|V|Hz|kHz|MHz|GHz|J|kJ|kJ\\/mol|kcal\\/mol|mol|M|mM|µM|nM|pN|nN|Pa|kPa|atm|W|kg|g|mg|Mpc|km\\/s|kT|yr|Gyr|years|bits?|bytes?|dB";
const NUMBER_WITH_UNIT = new RegExp(`[~≈<>]?\\s?[−+-]?\\d[\\d,.]*(?:\\s?[×x]\\s?10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)?\\s?(?:${UNIT})(?![\\p{L}\\d])`, "gu");

function balanced(s: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of s) {
    if ("([{".includes(ch)) stack.push(ch);
    else if (pairs[ch] && stack.pop() !== pairs[ch]) return false;
  }
  return stack.length === 0;
}

function contentWords(s: string): number {
  return s.split(/\s+/).filter((w) => bare(w).length >= 2 && !STOP.has(bare(w))).length;
}

const LEADING_BAN = new Set([...PREP, "which", "that", "who", "whose", "whom", "where", "whereas", "though", "although", "unless", "until", "once", "as", "than", "rather", "not", "only", "even", "then", "it", "its", "they", "there", "this", "these", "those", "making", "says", "set", "build", "merge", "compute", "use", "take", "convert", "add", "solve", "plug"]);
const FINITE = new Set([...VERBS, "stays", "stay", "yields", "yield", "sits", "sit", "grows", "grow", "closes", "close", "accesses", "encodes", "describe", "describes", "run", "runs", "need", "needs", "remains", "remain", "lowers", "raises", "rises", "falls", "changes", "forms", "acts", "occurs", "follows", "comes", "goes", "gets", "leads", "reduces", "increases", "decreases", "flows", "flow", "matters", "works", "fails", "explains", "predicts", "measures", "means", "rearranges", "terminates", "applies", "stabilizes", "suppresses", "sets", "favors", "differ", "differs", "share", "shares", "detects", "assigns", "rotates", "costs", "requires", "adds", "add", "points", "point", "preserves", "preserved", "suppress", "suppresses", "exchange", "exchanges", "strengthen", "strengthens", "bind", "binds", "fire", "fires", "move", "moves", "emit", "emits", "absorb", "absorbs", "carry", "carries", "drop", "drops"]);

function nounShaped(s: string): boolean {
  const words = s.trim().split(/\s+/);
  const first = bare(words[0] ?? "");
  const last = bare(words[words.length - 1] ?? "");
  if (LEADING_BAN.has(first) || STOP.has(last) || PREP.has(last) || LEADING_BAN.has(last)) return false;
  if (/^[a-z]/.test(words[0]) && /(ing|ed)$/.test(first) && words.length > 1) return false;
  if (/[=≈∝→<>]/.test(s)) return true;
  return !words.slice(1).some((w) => FINITE.has(bare(w))) && !FINITE.has(first);
}

function answerOk(s: string): boolean {
  if (!nounShaped(s)) return false;
  if (/\b(whose|that|which|who|where)\b/i.test(s) || /,\s*\p{L}+$/u.test(s)) return false;
  if (/[()]/.test(s) && !/[=≈∝→]/.test(s) && !/^\(.*\)$/.test(s)) return false;
  if ((s.match(/(^|\s)['‘"“]/g) ?? []).length !== (s.match(/['’"”]($|\s)/g) ?? []).length) return false;
  if (!balanced(s) || /^[=≈∝<>≤≥→+×·\/^−-]|[=≈∝<>≤≥→+×·\/^−-]$/.test(s.trim())) return false;
  if (/^[(~≈<>]?[−+-]?[\d.,]+\)?$/.test(s.trim()) || /,$/.test(s.trim())) return false;
  return countTokens(s) >= 1 && countTokens(s) <= LIMITS.option && longestToken(s) <= LIMITS.tokenChars && s.length <= 48 && hasContent(s);
}

function firstClause(item: Item): string {
  return item.answer.replace(/\s+/g, " ").trim().split(/;\s+|:\s+|\.\s+|\s+[—–]\s+|\s+-\s+|\?\s+|!\s+/)[0] ?? "";
}

function inFirstClause(item: Item, c: string): boolean {
  const a = item.answer.replace(/\s+/g, " ");
  const i = a.indexOf(c);
  return i >= 0 && a.indexOf(c) <= firstClause(item).length && !/^\s?[(:]/.test(a.slice(i + c.length)) && !a.slice(0, i).endsWith("(");
}

const explanatory = (item: Item) => /\b(why|explain|argue|how come|sketch|justify|in what sense|difference between|differ|compare|contrast|two|three|four|five|both|list|lines of|and isn't)\b/i.test(item.prompt) || /\bnot\b|n't\b/i.test(firstClause(item));

function answerCandidates(item: Item): string[][] {
  const a = item.answer.replace(/\s+/g, " ").trim();
  const strong = a.split(/;\s+|:\s+|\.\s+|\s+[—–]\s+|\s+-\s+|\?\s+|!\s+/).map(trimEdge).filter(Boolean);
  const clauses = [strong[0] ?? "", ...strong.slice(1), ...strong.flatMap((c) => c.replace(/\([^()]*\)/g, " ").split(/,\s+/).map(trimEdge)).filter((c) => contentWords(c) >= 2)];
  const first = clauses[0] ?? "";
  const formulas = strong.filter((c) => /[=≈∝→]/.test(c));
  const numeric = /\b(compute|calculate|estimate|how (much|many|long|far|fast|large|big)|value|roughly|approximately|find|what is the)\b/i.test(item.prompt);
  const numbers = numeric ? [...a.matchAll(NUMBER_WITH_UNIT)].map((m) => trimEdge(m[0])).reverse().slice(0, 1) : [];
  if (numbers.length && !a.replace(/[.\s]+$/, "").endsWith(numbers[0])) numbers.length = 0;
  const title = (() => {
    const i = a.toLowerCase().indexOf(item.title.toLowerCase());
    return i >= 0 ? a.slice(i, i + item.title.length) : "";
  })();
  return [clauses.slice(0, 1), formulas.slice(0, 1).filter((f) => f === strong[0]), numbers].map((group) =>
    group.filter((c) => c && inFirstClause(item, c)),
  );
}

function stemCandidates(prompt: string): string[] {
  const p = prompt.replace(/\s+/g, " ").trim();
  const out = [p];
  const q = p.match(/^(.+?),? (?:and|or) (?:why|how|what|which|when|where|who|is|are|does|do|can)\b.*\?$/i);
  if (q) out.push(q[1].replace(/[,;:]$/, "") + "?");
  const asked = (s: string) => {
    const m = s.match(/^(?:State|Define|Give|Write|Compute|Calculate|Evaluate|Find|Identify|Determine|Name)\s+(.+?)[.!]?$/);
    return m && !/^and\b|,| and (?:say|explain|state|give|describe|show|argue|why)\b/i.test(m[1]) ? `What is ${m[1]}?` : "";
  };
  for (const s of [p]) if (!s.endsWith("?")) out.push(asked(s));
  return out.map((s) => s.trim()).filter((s) => s.split(" ").length >= 3);
}

const isQuestion = (s: string) => !/\b(this|these|those|the given|above|that result|it|they|its|their)\b|\band (write|give|name|state|say)\b/i.test(s) && (s.endsWith("?") || /_{3,}/.test(s)) && /^[A-Z\p{Lu}]/u.test(s) && !/^(and|or|but|so)\b/i.test(s);

function stemOk(s: string, answer: string): boolean {
  return isQuestion(s) && countTokens(s) <= LIMITS.stem && s.length <= 150 && longestToken(s) <= LIMITS.tokenChars && !normShort(s).includes(normShort(answer));
}

function pickStem(item: Item, answer: string): string | null {
  return stemCandidates(item.prompt).find((s) => stemOk(s, answer)) ?? null;
}

function unique(branchTaken: Set<string>, s: string) {
  return !branchTaken.has(normShort(s));
}

async function modelShort(item: Item, taken: Set<string>): Promise<ShortField | null> {
  const ask = async (content: string) => {
    const res = await fetch(`${LLM}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "local", temperature: 0, max_tokens: 80, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return "";
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return trimEdge((j.choices?.[0]?.message?.content ?? "").split("\n")[0].replace(/^(answer|question)\s*:\s*/i, "").replace(/^["'`]|["'`]$/g, ""));
  };
  const answer = await ask(
    `Copy the shortest phrase, at most 5 words, from the ANSWER below that answers the QUESTION. Copy it exactly, character for character. Reply with the phrase only.\nQUESTION: ${item.prompt}\nANSWER: ${item.answer}`,
  );
  if (!answer || !inFirstClause(item, answer) || !answerOk(answer) || !unique(taken, answer)) return null;
  let stem = pickStem(item, answer);
  if (!stem) {
    const raw = (await ask(`Rewrite this question as one question of at most 12 words that ends with a question mark and keeps its subject. Reply with the question only.\nQUESTION: ${item.prompt}`)) + "?";
    const s = raw.replace(/\?+$/, "?");
    if (stemOk(s, answer)) stem = s;
  }
  return stem ? { short_stem: stem, short_answer: answer, source: "model" } : null;
}

async function llmUp(): Promise<boolean> {
  try {
    return (await fetch(`${LLM}/v1/models`, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}

function loadItems(): Item[] {
  const items: Item[] = [];
  for (const f of readdirSync(CORPUS).filter((f) => f.endsWith(".json")).sort()) {
    const corpus = JSON.parse(readFileSync(join(CORPUS, f), "utf8"));
    if (Array.isArray(corpus.atoms)) items.push(...itemsFromCorpus(f.replace(/\.json$/, ""), corpus));
  }
  return items;
}

function prune(items: Item[], fields: Record<string, ShortField>) {
  for (;;) {
    const pool = items.filter((i) => fields[i.id]).map((i) => ({ ...i, shortPrompt: fields[i.id].short_stem, shortAnswer: fields[i.id].short_answer }));
    const bad = pool.filter((i) => SEEDS.some((s) => {
      const q = buildShortQuestion(i, pool, s);
      return !q || checkLimits(q).length > 0;
    }));
    if (!bad.length) return;
    for (const b of bad) delete fields[b.id];
  }
}

const rank = (id: string) => createHash("sha256").update("review-2:" + id).digest("hex");

function sample(items: Item[], fields: Record<string, ShortField>): Item[] {
  const kept = items.filter((i) => fields[i.id]);
  const branches = [...new Set(kept.map((i) => i.branch))].sort();
  const quota = new Map(branches.map((b) => [b, Math.max(5, Math.floor((SAMPLE_SIZE * kept.filter((i) => i.branch === b).length) / kept.length))]));
  let total = [...quota.values()].reduce((a, b) => a + b, 0);
  for (const b of [...branches].sort((x, y) => quota.get(y)! - quota.get(x)!)) {
    if (total === SAMPLE_SIZE) break;
    const step = total > SAMPLE_SIZE ? -1 : 1;
    quota.set(b, quota.get(b)! + step);
    total += step;
  }
  return branches.flatMap((b) => kept.filter((i) => i.branch === b).sort((x, y) => rank(x.id).localeCompare(rank(y.id))).slice(0, quota.get(b)));
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ");

async function main() {
  const useModel = process.argv.includes("--model");
  const items = loadItems();
  const fields: Record<string, ShortField> = {};
  const taken = new Map<string, Set<string>>();
  const takenIn = (b: string) => taken.get(b) ?? taken.set(b, new Set()).get(b)!;
  const missing: Item[] = [];
  for (const item of items) {
    const t = takenIn(item.branch);
    if (explanatory(item)) continue;
    let found: ShortField | null = null;
    for (const group of answerCandidates(item)) {
      const valid = [...new Set(group)].filter((c) => answerOk(c) && unique(t, c));
      for (const ans of valid) {
        const stem = pickStem(item, ans);
        if (stem) {
          found = { short_stem: stem, short_answer: ans, source: "rule" };
          break;
        }
      }
      if (found) break;
    }
    if (found) {
      fields[item.id] = found;
      t.add(normShort(found.short_answer));
    } else missing.push(item);
  }
  const modelFile: Record<string, { short_stem: string; short_answer: string }> = existsSync(MODEL_FILE) ? JSON.parse(readFileSync(MODEL_FILE, "utf8")).items : {};
  const modelValid = (item: Item, f: { short_stem: string; short_answer: string } | undefined, t: Set<string>) =>
    !!f && inFirstClause(item, f.short_answer) && (!/^[~≈]?\d/.test(f.short_answer) || item.answer.replace(/[.\s]+$/, "").endsWith(f.short_answer)) && answerOk(f.short_answer) && unique(t, f.short_answer) && stemOk(f.short_stem, f.short_answer);
  const up = useModel && (await llmUp());
  if (useModel && !up) console.log(`no local model at ${LLM}; the committed model file is used as is`);
  for (const item of missing) {
    const t = takenIn(item.branch);
    if (explanatory(item)) continue;
    let f = modelFile[item.id];
    if (!modelValid(item, f, t) && up) {
      const got = await modelShort(item, t);
      if (got) modelFile[item.id] = f = { short_stem: got.short_stem, short_answer: got.short_answer };
      else delete modelFile[item.id];
    }
    if (f && modelValid(item, f, t)) {
      fields[item.id] = { ...f, source: "model" };
      t.add(normShort(f.short_answer));
    }
  }
  if (up) {
    const ids = items.map((i) => i.id).filter((id) => modelFile[id]);
    writeFileSync(MODEL_FILE, JSON.stringify({ items: Object.fromEntries(ids.map((id) => [id, modelFile[id]])) }, null, 1) + "\n");
  }
  prune(items, fields);
  const ordered = Object.fromEntries(items.filter((i) => fields[i.id]).map((i) => [i.id, fields[i.id]]));
  const version = createHash("sha256").update(JSON.stringify(ordered)).digest("hex").slice(0, 12);
  writeFileSync(OUT, JSON.stringify({ version, items: ordered }, null, 1) + "\n");
  const rows = sample(items, fields);
  const md = [
    "<!-- voice-ignore-file -->",
    "# Quiz Short Fields Review",
    "",
    `Short-fields version ${version}. ${rows.length} items sampled by branch from ${Object.keys(ordered).length} with short fields. Source rule is the extractor, model is the local model pass.`,
    "",
    "| Item | Full stem | Short stem | Full answer | Short answer | Source |",
    "|---|---|---|---|---|---|",
    ...rows.map((i) => `| ${i.id} | ${cell(i.prompt)} | ${cell(fields[i.id].short_stem)} | ${cell(i.answer)} | ${cell(fields[i.id].short_answer)} | ${fields[i.id].source} |`),
    "",
  ].join("\n");
  writeFileSync(SAMPLE, md);
  const branches = [...new Set(items.map((i) => i.branch))];
  console.log(`items ${items.length}, short ${Object.keys(ordered).length}, out ${items.length - Object.keys(ordered).length}, model ${Object.values(ordered).filter((f) => f.source === "model").length}`);
  for (const b of branches) {
    const all = items.filter((i) => i.branch === b);
    console.log(`${b}: ${all.filter((i) => ordered[i.id]).length}/${all.length}`);
  }
}

await main();
