import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fold } from "../../../../src/lib/research-os/work-quiz/polingual-forms";
import { DECK_FORMAT, DECK_FORMAT_VERSION, type DeckManifest } from "../../src/decks";

export type FixtureWord = [surface: string, ipa: string, pos: string, meaning: string, shared?: boolean];

export const FIXTURE_LICENCE = "CC-BY-SA 3.0";
export const FIXTURE_SOURCE = "Wiktionary via Kaikki (kaikki.org)";

const sha = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const head = (meaning: string) => meaning.split(" · ")[0].replace(/\([^)]*\)/g, " ").split(/[,;/]/)[0].trim().toLowerCase().replace(/^(to|a|an|the)\s+/, "");

export function buildDeck(root: string, lang: string, name: string, words: readonly FixtureWord[], o: { licence?: string | null; innerLicence?: string | null; id?: string; source?: string; curator?: string; sourceUrl?: string; wiktionaryUrl?: string | null; licenceUrl?: string; built?: string } = {}): { dir: string; manifest: DeckManifest; packed: string } {
  const id = o.id ?? `polingual-${lang}`;
  const dir = join(root, lang);
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, "build.sqlite");
  rmSync(dbPath, { force: true });
  const db = new Database(dbPath);
  db.exec("pragma journal_mode=off");
  db.exec("create table meta(k text primary key, v text not null) without rowid");
  db.exec("create table words(id integer primary key, surface text not null, folded text not null, ipa text not null, pos text not null, meaning text not null, head text not null, tier text not null, kind text not null, shared integer not null, translations text not null, etymology text not null)");
  const insert = db.prepare("insert into words(surface, folded, ipa, pos, meaning, head, tier, kind, shared, translations, etymology) values (?, ?, ?, ?, ?, ?, 'functional', 'word', ?, '', '')");
  for (const [surface, ipa, pos, meaning, shared] of words) insert.run(surface, fold(surface), ipa, pos, meaning, lang === "en" ? fold(surface) : head(meaning), shared ? 1 : 0);
  const inner = o.innerLicence === undefined ? (o.licence ?? FIXTURE_LICENCE) : o.innerLicence;
  const meta: Record<string, string> = { format: DECK_FORMAT, id, kind: "words", language: lang, source: o.source ?? FIXTURE_SOURCE, adaptation: "Adapted by Bucket Foundation. This pack is shared under the same licence.", rows: String(words.length) };
  if (inner !== null) meta.licence = inner;
  for (const [k, v] of Object.entries(meta)) db.prepare("insert into meta values (?, ?)").run(k, v);
  db.exec("create index words_head on words(head, id)");
  db.exec("create index words_folded on words(folded, id)");
  db.exec("create virtual table words_fts using fts5(surface, folded, meaning, content='words', content_rowid='id', tokenize='unicode61 remove_diacritics 2')");
  db.exec("insert into words_fts(words_fts) values('rebuild')");
  db.close();
  const raw = readFileSync(dbPath);
  const file = `${id}.sqlite.zst`;
  const packed = join(dir, file);
  writeFileSync(packed, Bun.zstdCompressSync(raw));
  const dbSha = sha(dbPath);
  rmSync(dbPath);
  const manifest = {
    format: DECK_FORMAT,
    format_version: DECK_FORMAT_VERSION,
    id,
    title: `${name} words`,
    kind: "words",
    language: lang,
    language_name: name,
    fields: ["surface", "ipa", "pos", "meaning", "tier", "kind", "translations", "etymology"],
    counts: { cards: words.length, with_ipa: words.filter((w) => w[1]).length, with_translations: 0, with_etymology: 0 },
    rows: words.length,
    version: dbSha.slice(0, 12),
    file,
    bytes: readFileSync(packed).length,
    sha256: sha(packed),
    db_bytes: raw.length,
    db_sha256: dbSha,
    source: o.source ?? FIXTURE_SOURCE,
    source_url: o.sourceUrl ?? "https://kaikki.org",
    ...(o.wiktionaryUrl === null ? {} : { wiktionary_url: o.wiktionaryUrl ?? "https://en.wiktionary.org" }),
    licence_url: o.licenceUrl ?? "https://creativecommons.org/licenses/by-sa/3.0/",
    curator: o.curator ?? "Bucket Foundation",
    adaptation: "Adapted by Bucket Foundation. This pack is shared under the same licence.",
    built: o.built ?? "2026-10-11",
    ...(o.licence === null ? {} : { licence: o.licence ?? FIXTURE_LICENCE }),
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return { dir, manifest: manifest as unknown as DeckManifest, packed };
}

export const GERMAN: FixtureWord[] = [
  ["Wasser", "/ˈvasɐ/", "noun", "water"],
  ["Tisch", "/tɪʃ/", "noun", "table · desk"],
  ["Stuhl", "/ʃtuːl/", "noun", "chair"],
  ["Fenster", "/ˈfɛnstɐ/", "noun", "window"],
  ["Löffel", "/ˈlœfl̩/", "noun", "spoon"],
  ["Gabel", "/ˈɡaːbl̩/", "noun", "fork"],
  ["Messer", "/ˈmɛsɐ/", "noun", "knife"],
  ["Teller", "/ˈtɛlɐ/", "noun", "plate"],
  ["Brücke", "/ˈbʁʏkə/", "noun", "bridge"],
  ["Straße", "/ˈʃtʁaːsə/", "noun", "street"],
  ["Kirche", "/ˈkɪʁçə/", "noun", "church"],
  ["Schule", "/ˈʃuːlə/", "noun", "school"],
  ["Garten", "/ˈɡaʁtn̩/", "noun", "garden"],
  ["Küche", "/ˈkʏçə/", "noun", "kitchen"],
  ["Zimmer", "/ˈtsɪmɐ/", "noun", "room"],
  ["Schlüssel", "/ˈʃlʏsl̩/", "noun", "key"],
  ["Hemd", "/hɛmt/", "noun", "shirt"],
  ["Schuh", "/ʃuː/", "noun", "shoe"],
  ["Mantel", "/ˈmantl̩/", "noun", "coat"],
  ["Hut", "/huːt/", "noun", "hat", true],
  ["kaufen", "/ˈkaʊ̯fn̩/", "verb", "to buy"],
  ["helfen", "/ˈhɛlfn̩/", "verb", "to help"],
  ["Tische", "", "noun", "plural of Tisch"],
  ["Zimmer frei", "", "phrase", "vacancies"],
  ["Berlin", "/bɛʁˈliːn/", "name", "Berlin (the capital of Germany)"],
  ["Gebäudereinigungsunternehmensverwaltungsangestellter", "", "noun", "clerk"],
  ["Dorf", "/dɔʁf/", "noun", "village"],
  ["Wald", "/valt/", "noun", "forest"],
  ["Feld", "/fɛlt/", "noun", "field", true],
  ["Wiese", "/ˈviːzə/", "noun", "meadow"],
];

export const ARABIC: FixtureWord[] = [
  ["كِتَاب", "/ki.taːb/", "noun", "book"],
  ["مَدْرَسَة", "/mad.ra.sa/", "noun", "school"],
  ["نَافِذَة", "/naː.fi.ða/", "noun", "window"],
  ["كُرْسِيّ", "/kur.sijj/", "noun", "chair"],
  ["مِفْتَاح", "/mif.taːħ/", "noun", "key"],
  ["جِسْر", "/d͡ʒisr/", "noun", "bridge"],
  ["شَارِع", "/ʃaː.riʕ/", "noun", "street"],
  ["حَدِيقَة", "/ħa.diː.qa/", "noun", "garden"],
  ["قَمِيص", "/qa.miːsˤ/", "noun", "shirt"],
  ["قَرْيَة", "/qar.ja/", "noun", "village"],
];

export const CHINESE: FixtureWord[] = [
  ["桌子", "/ʈ͡ʂwɔ t͡sz̩/", "noun", "table"],
  ["椅子", "/i t͡sz̩/", "noun", "chair"],
  ["窗户", "/ʈ͡ʂʰwɑŋ xu/", "noun", "window"],
  ["学校", "/ɕɥɛ ɕjɑʊ̯/", "noun", "school"],
  ["钥匙", "/jɑʊ̯ ʂʐ̩/", "noun", "key"],
  ["花园", "/xwä ɥɛn/", "noun", "garden"],
  ["街道", "/t͡ɕjɛ tɑʊ̯/", "noun", "street"],
  ["衬衫", "/ʈ͡ʂʰən ʂän/", "noun", "shirt"],
  ["村庄", "/t͡sʰwən ʈ͡ʂwɑŋ/", "noun", "village"],
  ["桥梁", "/t͡ɕʰjɑʊ̯ ljɑŋ/", "noun", "bridge"],
];
