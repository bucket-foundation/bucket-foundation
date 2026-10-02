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

function answerOk(s: string): boolean {
  if (!balanced(s) || /^[=≈∝<>≤≥→+×·\/^−-]|[=≈∝<>≤≥→+×·\/^−-]$/.test(s.trim())) return false;
  if (/^[(~≈<>]?[−+-]?[\d.,]+\)?$/.test(s.trim()) || /,$/.test(s.trim())) return false;
  return countTokens(s) >= 1 && countTokens(s) <= LIMITS.option && longestToken(s) <= LIMITS.tokenChars && s.length <= 48 && hasContent(s);
}

function answerCandidates(item: Item): string[][] {
  const a = item.answer.replace(/\s+/g, " ").trim();
  const strong = a.split(/;\s+|:\s+|\.\s+|\s+[—–]\s+|\s+-\s+|\?\s+|!\s+/).map(trimEdge).filter(Boolean);
  const clauses = [strong[0] ?? "", ...strong.slice(1), ...strong.flatMap((c) => c.split(/,\s+|\s*\(|\)\s*/).map(trimEdge)).filter((c) => contentWords(c) >= 2)];
  const first = clauses[0] ?? "";
  const lead = (c: string) => {
    const words = c.split(" ");
    if (PREP.has(bare(words[0] ?? ""))) return "";
    const cut = words.findIndex((w, i) => i > 0 && VERBS.has(bare(w)));
    return dropTrailingStop(cut > 0 ? words.slice(0, cut) : words).join(" ");
  };
  const formulas = strong.filter((c) => /[=≈∝→]/.test(c));
  const numeric = /\b(compute|calculate|estimate|how (much|many|long|far|fast|large|big)|value|roughly|approximately|find|what is the)\b/i.test(item.prompt);
  const numbers = numeric ? [...a.matchAll(NUMBER_WITH_UNIT)].map((m) => trimEdge(m[0])).reverse().slice(0, 1) : [];
  const title = (() => {
    const i = a.toLowerCase().indexOf(item.title.toLowerCase());
    return i >= 0 ? a.slice(i, i + item.title.length) : "";
  })();
  return [
    clauses.slice(0, 1),
    [lead(first)].filter((c) => contentWords(c) >= 2),
    formulas,
    [title],
    numbers,
    clauses.slice(1),
    clauses.slice(1).map(lead).filter((c) => contentWords(c) >= 2),
  ].map((group) => group.filter((c) => c && a.includes(c) && !PREP.has(bare(c.split(" ")[0]))));
}

function stemCandidates(prompt: string): string[] {
  const p = prompt.replace(/\s+/g, " ").trim();
  const out = [p];
  const q = p.match(/^(.+?),? (?:and|or) (?:why|how|what|which|when|where|who|name|give|state|say|explain|is|are|does|do)\b.*$/i);
  if (q) out.push(q[1].replace(/[,;:]$/, "") + (p.trim().endsWith("?") ? "?" : "."));
  const sentences = p.split(/(?<=[.?!])\s+/).filter(Boolean);
  const ordered = [...sentences.filter((s) => s.includes("?")), ...sentences.filter((s) => !s.includes("?")).reverse()];
  for (const s of ordered) {
    out.push(s);
    const parts = s.split(/(?<=[,:;])\s+/);
    for (let i = 1; i < parts.length; i++) out.push(parts.slice(i).join(" "));
  }
  return out.map((s) => s.trim()).filter((s) => s.split(" ").length >= 3 && !/^(and|or|but|so)\b/i.test(s));
}

function stemOk(s: string, answer: string): boolean {
  return countTokens(s) <= LIMITS.stem && s.length <= 150 && longestToken(s) <= LIMITS.tokenChars && !normShort(s).includes(normShort(answer));
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
  if (!answer || !item.answer.includes(answer) || !answerOk(answer) || !unique(taken, answer)) return null;
  let stem = pickStem(item, answer);
  if (!stem) {
    const s = await ask(`Copy a part of this question, at most 15 words, that still asks the question. Copy it exactly. Reply with the part only.\nQUESTION: ${item.prompt}`);
    if (s && item.prompt.includes(s) && stemOk(s, answer)) stem = s;
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

const rank = (id: string) => createHash("sha256").update("review:" + id).digest("hex");

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
  const prev: ShortFile | null = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
  const fields: Record<string, ShortField> = {};
  const taken = new Map<string, Set<string>>();
  const takenIn = (b: string) => taken.get(b) ?? taken.set(b, new Set()).get(b)!;
  const missing: Item[] = [];
  for (const item of items) {
    const t = takenIn(item.branch);
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
  const up = useModel && (await llmUp());
  if (useModel && !up) console.log(`no local model at ${LLM}; ${missing.length} items stay out`);
  for (const item of missing) {
    const t = takenIn(item.branch);
    const old = prev?.items[item.id];
    const keep = old?.source === "model" && item.answer.includes(old.short_answer) && answerOk(old.short_answer) && unique(t, old.short_answer) && stemOk(old.short_stem, old.short_answer) && item.prompt.includes(old.short_stem) ? old : null;
    const got = keep ?? (up ? await modelShort(item, t) : null);
    if (got) {
      fields[item.id] = got;
      t.add(normShort(got.short_answer));
    }
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
