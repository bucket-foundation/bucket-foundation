/**
 * POST /api/academy/generate — generate a Bucket Academy deck for ANY topic or
 * ANY language, on demand, via the Anthropic SDK.
 *
 * This is what generalizes the Academy beyond its seven fixed canon branches: a
 * learner names a topic (or a target language + the languages they already know)
 * and we synthesize a foundations-first deck of ~20–30 atoms (science schema) or
 * ~40–60 vocab entries (language schema). The client persists the returned deck to
 * localStorage and (when signed in) syncs it server-side; it is NOT written to disk
 * and NOT committed — generated decks are runtime artifacts.
 *
 * Request body (JSON):
 *   { kind: "topic",    topic: string, level?: "intro"|"standard"|"advanced" }
 *   { kind: "language", target: string (lang code or name), known: string[] }
 *
 * Response (200): { meta, atoms }  — same shape the static corpus files use.
 * Errors: 400 bad_request · 429 rate/budget · 500 generation_failed · 503 no_key.
 *
 * Anti-hallucination: the system prompt forbids invented facts/sources, requires
 * real open references (Wikipedia / LibreTexts / Wiktionary / Khan / OCW / arXiv),
 * and asks for original explanatory prose. Output is schema-validated server-side
 * before return; malformed or empty output is rejected rather than passed through.
 *
 * Metering: org standard is to route metered AI spend through Viatika (see
 * `@/lib/meter`). v1 leaves this as a TODO so the create flow ships unblocked; the
 * hook below is where the meterUsage()/true-up call belongs.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Current as of 2026-06. Sonnet is the right cost/quality point for deck synthesis.
const MODEL = "claude-sonnet-4-5";

// Hard caps so a single request can't run away on cost or payload size.
const MAX_TOKENS = 8000;
const MAX_TOPIC_LEN = 100;
const MAX_ATOMS_TOPIC = 30;
const MAX_ATOMS_LANG = 60;
const MAX_LANGS = 6;

// Short, common language-code → name map for prompt clarity (free-text also allowed).
const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", it: "Italian", pt: "Portuguese",
  de: "German", la: "Latin", nl: "Dutch", sv: "Swedish", ru: "Russian",
  pl: "Polish", ja: "Japanese", zh: "Mandarin Chinese", ko: "Korean",
  ar: "Arabic", hi: "Hindi", el: "Greek", tr: "Turkish", he: "Hebrew",
  vi: "Vietnamese",
};
const langName = (code: string) => LANG_NAMES[code] || code;

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/* ----------------------------- prompts ----------------------------- */

const ANTI_HALLUCINATION =
  "You are generating learning content for Bucket Academy, a foundations-first study app. " +
  "HARD RULES: (1) State only well-established facts; if something is uncertain or contested, omit it or mark it plainly — never invent. " +
  "(2) Every `resources` URL MUST be a real, stable, openly-accessible page on a reputable site you are confident exists: " +
  "Wikipedia, Wikiversity, Wiktionary, LibreTexts, NCBI Bookshelf, Khan Academy, MIT OpenCourseWare, Stanford Encyclopedia of Philosophy, arXiv, or Project Gutenberg. " +
  "Prefer canonical Wikipedia/Wiktionary article URLs (en.wikipedia.org/wiki/<Title>) which are stable — do NOT fabricate deep links, anchors, query strings, PDF paths, or DOIs you are unsure about. " +
  "(3) All explanatory prose must be ORIGINAL writing in your own words — do not copy from sources. " +
  "(4) Equations and language translations are facts: get them right or omit them. " +
  "(5) Output ONLY the requested JSON — no markdown fences, no commentary before or after.";

function topicPrompt(topic: string, level: string, n: number) {
  const depthGuide =
    level === "intro"
      ? "Assume ZERO background. Keep it gentle and concrete."
      : level === "advanced"
      ? "Assume a motivated learner; be rigorous and include real derivations."
      : "Assume a curious beginner building a solid working foundation.";
  return (
    `Generate a foundations-first study deck for the topic: "${topic}".\n` +
    `Depth: ${level}. ${depthGuide}\n` +
    `Produce ${Math.min(n, MAX_ATOMS_TOPIC)} concept "atoms" ordered so prerequisites come before what depends on them.\n\n` +
    `Return a single JSON object: { "meta": {...}, "atoms": [...] }.\n\n` +
    `meta = { "title": "<topic, title-cased>", "kind": "concept" }.\n\n` +
    `Each atom = {\n` +
    `  "id": "<short_snake_case_unique_slug>",\n` +
    `  "title": "<concept name>",\n` +
    `  "shell": "prereq" | "nucleus" | "frontier",   // prereq = foundational, nucleus = core, frontier = advanced\n` +
    `  "type": "concept" | "equation" | "principle",\n` +
    `  "requires": ["<id of a prerequisite atom in THIS deck>", ...],   // [] for foundational atoms; ids MUST exist in this deck\n` +
    `  "equation": "<KaTeX, no $ delimiters>",        // OPTIONAL — only if the concept has a real defining equation\n` +
    `  "summary": "<one-sentence plain-language summary>",\n` +
    `  "depths": { "eli5": "<plain, ~2-3 sentences>", "core": "<the working explanation, ~4-6 sentences>", "deep": "<the rigorous detail, ~3-5 sentences>" },\n` +
    `  "note": "<one memorable rule of thumb>",        // OPTIONAL\n` +
    `  "resources": [ { "label": "<what this link teaches>", "url": "<real open URL>" }, ... ],   // 3-6 real links\n` +
    `  "quiz": [ { "level": "recall"|"apply"|"derive"|"teach", "prompt": "<question>", "answer": "<answer>", "eq": "<KaTeX, optional>" }, ... ]   // 1-3 items, at least one "recall"\n` +
    `}\n\n` +
    `Constraints: ids are unique within the deck; every value in "requires" is an id that also appears in this deck; at least 3 atoms have shell "prereq"; original prose throughout. Output ONLY the JSON object.`
  );
}

function languagePrompt(targetName: string, knownNames: string[], langKeys: string[], n: number) {
  const keyList = langKeys.join(", ");
  return (
    `Generate a polyglot vocabulary deck for a learner studying ${targetName}, ` +
    `who already knows ${knownNames.join(", ")}.\n` +
    `Produce ${Math.min(n, MAX_ATOMS_LANG)} of the most useful core words and short phrases ` +
    `(numbers, greetings, pronouns, common verbs, food, time, travel, everyday nouns), ` +
    `ordered easiest/most-frequent first.\n\n` +
    `Return a single JSON object: { "meta": {...}, "atoms": [...] }.\n\n` +
    `meta = { "title": "${targetName} — vocabulary", "kind": "language", "languages": [${langKeys
      .map((k) => `"${k}"`)
      .join(", ")}] }.\n` +
    `(The "languages" array lists the language CODES used as keys in every atom's "forms".)\n\n` +
    `Each atom = {\n` +
    `  "id": "<short_snake_case_unique_slug, e.g. the English gloss>",\n` +
    `  "gloss": "<the meaning in English, e.g. 'water'>",\n` +
    `  "category": "<group: number | greeting | pronoun | verb | food | time | travel | noun | other>",\n` +
    `  "pos": "<part of speech>",\n` +
    `  "shell": "prereq" | "nucleus" | "frontier",   // prereq = most basic/frequent\n` +
    `  "requires": [],\n` +
    `  "forms": { ${keyList
      .split(", ")
      .map((k) => `"${k}": { "word": "<word in ${langName(k)}>", "ipa": "<IPA, no slashes>", "gender": "<if applicable, else omit>" }`)
      .join(", ")} },\n` +
    `  "note": "<short etymology or usage tip>",       // OPTIONAL\n` +
    `  "example": { ${langKeys
      .map((k) => `"${k}": "<an ORIGINAL short example sentence using the word, in ${langName(k)}>"`)
      .join(", ")} },   // OPTIONAL but encouraged\n` +
    `  "resources": [ { "label": "Wiktionary: <word>", "url": "https://en.wiktionary.org/wiki/<word>" } ]\n` +
    `}\n\n` +
    `EVERY atom MUST include a "forms" entry with a real "word" for EACH of these language codes: ${keyList}. ` +
    `Translations and IPA must be correct — never invent. Example sentences must be your own original writing. ` +
    `Output ONLY the JSON object.`
  );
}

/* ------------------------- response parsing ------------------------- */

// Pull the first balanced top-level JSON object out of the model's text. Robust to
// stray prose or a markdown fence even though the prompt forbids them.
function extractJson(text: string): any | null {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const SHELLS = new Set(["prereq", "nucleus", "frontier"]);

// Validate + sanitize a concept (science) deck. Drops dangling `requires`, clamps
// size, and guarantees the shape the static app + validate.sh expect.
function sanitizeConceptDeck(raw: any, topic: string) {
  if (!raw || !Array.isArray(raw.atoms)) return null;
  const seen = new Set<string>();
  const atoms: any[] = [];
  for (const a of raw.atoms) {
    if (!a || typeof a.id !== "string" || !a.title) continue;
    const id = a.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    atoms.push(a);
    if (atoms.length >= MAX_ATOMS_TOPIC) break;
  }
  if (atoms.length < 3) return null;
  const ids = new Set(atoms.map((a) => a.id));
  const cleaned = atoms.map((a) => {
    const depths = a.depths && typeof a.depths === "object" ? a.depths : {};
    const summary = String(a.summary || depths.core || a.title);
    const quiz =
      Array.isArray(a.quiz) && a.quiz.length
        ? a.quiz
            .filter((q: any) => q && q.prompt && q.answer)
            .map((q: any) => ({
              level: ["recall", "apply", "derive", "teach"].includes(q.level) ? q.level : "recall",
              prompt: String(q.prompt),
              answer: String(q.answer),
              ...(q.eq ? { eq: String(q.eq) } : {}),
            }))
        : [{ level: "recall", prompt: "What is " + a.title + "?", answer: summary }];
    return {
      id: a.id,
      title: String(a.title),
      shell: SHELLS.has(a.shell) ? a.shell : "nucleus",
      type: typeof a.type === "string" ? a.type : a.equation ? "equation" : "concept",
      requires: Array.isArray(a.requires) ? a.requires.filter((r: any) => ids.has(r) && r !== a.id) : [],
      ...(a.equation ? { equation: String(a.equation) } : {}),
      summary,
      depths: {
        eli5: String(depths.eli5 || summary),
        core: String(depths.core || summary),
        deep: String(depths.deep || depths.core || summary),
      },
      ...(a.note ? { note: String(a.note) } : {}),
      resources: sanitizeResources(a.resources),
      quiz: quiz.length ? quiz : [{ level: "recall", prompt: "What is " + a.title + "?", answer: summary }],
    };
  });
  return {
    meta: {
      title: String((raw.meta && raw.meta.title) || topic),
      kind: "concept",
      generated: true,
      version: "1.0.0",
      license: "Generated for Bucket Academy — original prose; facts/equations not copyrightable.",
    },
    atoms: cleaned,
  };
}

// Validate + sanitize a language deck against the chosen language keys.
function sanitizeLanguageDeck(raw: any, targetName: string, langKeys: string[]) {
  if (!raw || !Array.isArray(raw.atoms)) return null;
  const seen = new Set<string>();
  const atoms: any[] = [];
  for (const a of raw.atoms) {
    if (!a || typeof a.id !== "string") continue;
    const gloss = a.gloss || a.id;
    const forms = a.forms && typeof a.forms === "object" ? a.forms : null;
    // require a real word for every chosen language
    if (!forms || !langKeys.every((k) => forms[k] && forms[k].word)) continue;
    const id = a.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    atoms.push({
      id,
      gloss: String(gloss),
      ...(a.category ? { category: String(a.category) } : { category: "other" }),
      ...(a.pos ? { pos: String(a.pos) } : {}),
      shell: SHELLS.has(a.shell) ? a.shell : "prereq",
      requires: [],
      forms: Object.fromEntries(
        langKeys.map((k) => [
          k,
          {
            word: String(forms[k].word),
            ...(forms[k].ipa ? { ipa: String(forms[k].ipa) } : {}),
            ...(forms[k].gender ? { gender: String(forms[k].gender) } : {}),
          },
        ])
      ),
      ...(a.note ? { note: String(a.note) } : {}),
      ...(a.example && typeof a.example === "object" ? { example: a.example } : {}),
      resources: sanitizeResources(a.resources),
    });
    if (atoms.length >= MAX_ATOMS_LANG) break;
  }
  if (atoms.length < 5) return null;
  return {
    meta: {
      title: targetName + " — vocabulary",
      kind: "language",
      languages: langKeys,
      generated: true,
      version: "1.0.0",
      license: "Translations/IPA are facts; example sentences original; cross-check against Wiktionary.",
    },
    atoms,
  };
}

function sanitizeResources(r: any) {
  if (!Array.isArray(r)) return [];
  return r
    .filter((x: any) => x && typeof x.url === "string" && /^https?:\/\//i.test(x.url))
    .slice(0, 8)
    .map((x: any) => ({ label: String(x.label || x.url), url: String(x.url) }));
}

/* ------------------------------- handler ------------------------------- */

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON body.");
  }

  const kind = body && body.kind;
  if (kind !== "topic" && kind !== "language") {
    return bad(400, "Body must include kind: 'topic' or 'language'.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return bad(503, "Deck generation isn't configured yet (missing ANTHROPIC_API_KEY).");
  }

  // TODO(bkt-o52): route this spend through Viatika via `@/lib/meter` meterUsage(),
  // pre-charge an estimate and true-up from response.usage. Org standard is that ALL
  // metered AI spend flows through the Viatika vendor API. Left as a hook for v1 so
  // the create-topic / create-language flow ships unblocked.

  let prompt: string;
  let mode: "topic" | "language" = kind;
  let topicName = "";
  let targetName = "";
  let langKeys: string[] = [];

  if (kind === "topic") {
    const topic = String((body.topic || "")).trim();
    if (!topic) return bad(400, "Please provide a topic.");
    if (topic.length > MAX_TOPIC_LEN) return bad(400, "Topic is too long.");
    const level = ["intro", "standard", "advanced"].includes(body.level) ? body.level : "standard";
    topicName = topic;
    prompt = topicPrompt(topic, level, MAX_ATOMS_TOPIC);
  } else {
    const target = String((body.target || "")).trim();
    if (!target) return bad(400, "Please choose a target language.");
    let known: string[] = Array.isArray(body.known)
      ? body.known.map((k: any) => String(k).trim()).filter(Boolean)
      : [];
    known = known.filter((k) => k !== target);
    if (!known.length) known = ["en"];
    // language codes used as `forms` keys: target first, then known (deduped, capped)
    langKeys = Array.from(new Set([target, ...known])).slice(0, MAX_LANGS);
    targetName = langName(target);
    prompt = languagePrompt(targetName, known.map(langName), langKeys, MAX_ATOMS_LANG);
  }

  const anthropic = new Anthropic({ apiKey });
  let text = "";
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: ANTI_HALLUCINATION,
      messages: [{ role: "user", content: prompt }],
    });
    text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (e: any) {
    const status = e && e.status;
    if (status === 429) return bad(429, "Rate limited — please try again in a moment.");
    return bad(500, "Generation failed. Please try again.");
  }

  const raw = extractJson(text);
  if (!raw) return bad(500, "The model returned an unparseable deck. Please try again.");

  const deck =
    mode === "language"
      ? sanitizeLanguageDeck(raw, targetName, langKeys)
      : sanitizeConceptDeck(raw, topicName);

  if (!deck) {
    return bad(500, "The generated deck was incomplete. Please try again.");
  }

  return NextResponse.json(deck, {
    status: 200,
    headers: { "cache-control": "no-store", "x-academy-generated": "1" },
  });
}
