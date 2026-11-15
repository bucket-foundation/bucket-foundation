import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LANGS = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ar", "hi", "ja", "zh", "ko", "he", "fa", "tr", "cs", "id", "vi", "th", "ta"];
const dir = join(__dirname, "..", "polingual", "public", "library");
const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

type Book = { id: string; title: Record<string, string>; sentences: Record<string, string>[]; translation: string; translations?: Record<string, string>; translators?: Record<string, string>; illustrator?: string; [k: string]: unknown };
type Entry = { id: string; title: Record<string, string>; sentences: number; langs: string[]; updated: string; [k: string]: unknown };

const read = <T>(file: string): T => JSON.parse(readFileSync(join(dir, file), "utf8"));

const checkLangs = (where: string, obj: Record<string, string>, langs: string[]) => {
  for (const l of langs) {
    const v = obj?.[l];
    if (typeof v !== "string" || v.trim() === "") fail(`${where}: missing or empty ${l}`);
  }
};

const walkStrings = (where: string, v: unknown, skipKeys: Set<string>) => {
  if (typeof v === "string") {
    if (/gutenberg/i.test(v)) fail(`${where}: mentions Gutenberg`);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => walkStrings(`${where}[${i}]`, x, skipKeys));
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) if (!skipKeys.has(k)) walkStrings(`${where}.${k}`, x, skipKeys);
  }
};

const checkTranslations = (id: string, book: Book) => {
  if (!["machine", "human", "mixed"].includes(book.translation)) fail(`${id}: translation must be machine, human or mixed`);
  const map = book.translations;
  if (map === undefined) {
    if (book.translation !== "machine") fail(`${id}: translations map required unless all machine`);
    return;
  }
  if (JSON.stringify(Object.keys(map)) !== JSON.stringify(LANGS)) fail(`${id}: translations must list the 25 languages in order`);
  const kinds = Array.from(new Set(Object.values(map)));
  for (const k of kinds) if (k !== "human" && k !== "machine") fail(`${id}: translations value ${k} must be human or machine`);
  const want = kinds.length > 1 ? "mixed" : kinds[0];
  if (book.translation !== want) fail(`${id}: translation is ${book.translation}, translations map says ${want}`);
  const translators = book.translators ?? {};
  for (const [l, name] of Object.entries(translators)) {
    if (map[l] !== "human") fail(`${id}: translator listed for non-human ${l}`);
    if (typeof name !== "string" || name.trim() === "") fail(`${id}: empty translator for ${l}`);
  }
  for (const l of LANGS) if (l !== "en" && map[l] === "human" && !translators[l]) fail(`${id}: human ${l} has no translator`);
  if (typeof book.illustrator !== "string" || book.illustrator.trim() === "") fail(`${id}: illustrator required when translations are listed`);
};

const index = read<{ version: number; books: Entry[] }>("index.json");
if (index.version !== 1) fail("index: version must be 1");

const ids = index.books.map((b) => b.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) fail(`index: duplicate ids ${dupes.join(", ")}`);

const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json").map((f) => f.slice(0, -5));
for (const f of files) if (!ids.includes(f)) fail(`${f}.json: not listed in index`);

for (const entry of index.books) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.id)) fail(`${entry.id}: id is not kebab-case`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.updated ?? "")) fail(`${entry.id}: updated must be YYYY-MM-DD`);
  if (!files.includes(entry.id)) {
    fail(`${entry.id}: listed in index but file missing`);
    continue;
  }
  const book = read<Book>(`${entry.id}.json`);
  if (book.id !== entry.id) fail(`${entry.id}: file id ${book.id} does not match`);
  if (book.sentences.length !== entry.sentences) fail(`${entry.id}: index says ${entry.sentences} sentences, file has ${book.sentences.length}`);
  if (JSON.stringify(book.title) !== JSON.stringify(entry.title)) fail(`${entry.id}: title differs from index`);
  for (const k of ["author", "license", "source", "translation"]) if (book[k] !== entry[k]) fail(`${entry.id}: ${k} differs from index`);
  if (JSON.stringify(entry.langs) !== JSON.stringify(LANGS)) fail(`${entry.id}: langs must be the 25 v1 languages`);
  checkLangs(`${entry.id} title`, book.title, LANGS);
  if (book.sentences.length === 0) fail(`${entry.id}: no sentences`);
  book.sentences.forEach((s, i) => {
    checkLangs(`${entry.id} sentence ${i + 1}`, s, LANGS);
    const extra = Object.keys(s).filter((k) => !LANGS.includes(k));
    if (extra.length) fail(`${entry.id} sentence ${i + 1}: unknown keys ${extra.join(", ")}`);
  });
  checkTranslations(entry.id, book);
  if (JSON.stringify(entry.translations) !== JSON.stringify(book.translations)) fail(`${entry.id}: index translations differ from book`);
  if (entry.illustrator !== book.illustrator) fail(`${entry.id}: illustrator differs from index`);
  walkStrings(entry.id, book, new Set(["source"]));
}
walkStrings("index", index, new Set(["source"]));

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`library ok: ${index.books.length} books, ${LANGS.length} languages`);
