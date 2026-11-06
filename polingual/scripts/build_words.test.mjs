import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { CORPUS_DIR, OUT_FILE, buildWords, cleanNote, readAudio, rootClusters, uncredited } from "./build_words.mjs";
import { authorFromWikitext, commonsMp3, credit, kaikkiUrl, pageTitle, pickSound, plainArtist, wikitextAudio } from "./fetch_word_audio.mjs";

test("notes lose dashes and internal tier notes", () => {
  assert.equal(cleanNote("From Latin 'terra' \u2014 root of 'terrain'. A canon-tier word tying to physics."), "From Latin 'terra', root of 'terrain'.");
  assert.equal(cleanNote("The same *tr\u00e9yes \u2014 once you see 'tri-' you see them all."), "The same *tr\u00e9yes. Once you see 'tri-' you see them all.");
  assert.equal(cleanNote("From 'domina' (lady \u2014 root of 'dame')."), "From 'domina' (lady, root of 'dame').");
  assert.equal(cleanNote(""), undefined);
});

test("root clusters skip suffixes and repeated language sets", () => {
  const c = { clusters: [{ root: "*wódr̥", langs: ["en", "ru"] }, { root: "*wed-", langs: ["ru", "en"] }, { root: "*-r̥", langs: ["en", "pl"] }, { root: "*x", langs: ["en"] }] };
  assert.deepEqual(rootClusters(c), [{ root: "*wódr̥", langs: ["en", "ru"] }]);
});

test("words.json matches the corpus", { skip: !existsSync(CORPUS_DIR) && "apple/Shared/Corpus not checked out" }, () => {
  assert.deepEqual(JSON.parse(readFileSync(OUT_FILE, "utf8")), buildWords());
});

test("page titles drop the marks Wiktionary leaves out of titles", () => {
  assert.equal(pageTitle("ar", "لَيْلَة"), "ليلة");
  assert.equal(pageTitle("he", "לַיְלָה"), "לילה");
  assert.equal(pageTitle("ru", "вода́"), "вода");
  assert.equal(pageTitle("ru", "ёж"), "ёж");
  assert.equal(pageTitle("la", "aqua"), "aqua");
  assert.equal(pageTitle("la", "nōx"), "nox");
  assert.equal(pageTitle("ang", "ċild"), "cild");
  assert.equal(pageTitle("de", "Nacht"), "Nacht");
});

test("kaikki urls nest the word under its first one and two characters", () => {
  assert.equal(kaikkiUrl("de", "Nacht"), "https://kaikki.org/dictionary/German/meaning/N/Na/Nacht.jsonl");
  assert.equal(kaikkiUrl("ja", "夜"), `https://kaikki.org/dictionary/Japanese/meaning/${encodeURIComponent("夜")}/${encodeURIComponent("夜")}/${encodeURIComponent("夜")}.jsonl`);
  assert.equal(kaikkiUrl("grc", "νύξ"), `https://kaikki.org/dictionary/Ancient%20Greek/meaning/${encodeURIComponent("ν")}/${encodeURIComponent("νύ")}/${encodeURIComponent("νύξ")}.jsonl`);
  assert.equal(kaikkiUrl("xx", "a"), undefined);
});

test("the first mp3 recording is picked and Chinese skips other varieties", () => {
  const a = { audio: "a.ogg", mp3_url: "https://upload.wikimedia.org/a.mp3" };
  const b = { audio: "b.ogg", mp3_url: "https://upload.wikimedia.org/b.mp3" };
  assert.deepEqual(pickSound([{ sounds: [{ ipa: "x" }, a] }, { sounds: [a, b] }], "es"), { file: "a.ogg", src: a.mp3_url });
  assert.equal(pickSound([{ sounds: [{ audio: "c.wav" }] }], "es"), undefined);
  assert.equal(pickSound([], "es"), undefined);
  const yue = { audio: "yue.ogg", mp3_url: "https://upload.wikimedia.org/yue.mp3", tags: ["Cantonese"] };
  assert.deepEqual(pickSound([{ sounds: [yue, b] }], "zh"), { file: "b.ogg", src: b.mp3_url });
});

test("credits keep the license and a plain-text author", () => {
  const meta = { LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: '<a href="//x">Back&amp;ache</a>' }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" } };
  assert.deepEqual(credit(meta), { license: "CC BY-SA 4.0", by: "Back&ache", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" });
  assert.equal(credit({ Artist: { value: "x" } }), undefined);
  assert.equal(plainArtist(""), undefined);
});

test("audio attaches to the matching form only", { skip: !existsSync(CORPUS_DIR) && "apple/Shared/Corpus not checked out" }, () => {
  const audio = { "es:noche": { src: "https://upload.wikimedia.org/n.mp3", file: "n.ogg", license: "CC0" } };
  const night = buildWords(CORPUS_DIR, audio).find((w) => w.slug === "night");
  assert.deepEqual(night.forms.find((f) => f.lang === "es").audio, audio["es:noche"]);
  assert.equal(night.forms.find((f) => f.lang === "fr").audio, undefined);
});

test("wikitext audio comes from the right language section", () => {
  const text = "==Czech==\n* {{audio|cs|Cs-noc.ogg}}\n==Polish==\n{{pl-pr|a=Pl-noc.ogg|mp=#}}\n==Silesian==\n{{szl-pr|a=LL-Q30319 (szl)-Vxern-#.wav}}\n";
  assert.equal(wikitextAudio(text, "pl", "noc"), "Pl-noc.ogg");
  assert.equal(wikitextAudio(text, "cs", "noc"), "Cs-noc.ogg");
  assert.equal(wikitextAudio(text, "fi", "noc"), undefined);
  assert.equal(wikitextAudio("==Spanish==\n{{es-pr|+<audio:LL-Q1321 (spa)-Rodelar-noche.wav<a:Spain>>}}\n", "es", "noche"), "LL-Q1321 (spa)-Rodelar-noche.wav");
  assert.equal(wikitextAudio("==Finnish==\n{{fi-pronunciation|a=LL-Q1412 (fin)-x-#.wav}}\n", "fi", "yö"), "LL-Q1412 (fin)-x-yö.wav");
});

test("commons mp3 urls follow the upload hash layout", () => {
  assert.equal(commonsMp3("En-us-night.ogg"), "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/46/En-us-night.ogg/En-us-night.ogg.mp3");
});

test("recordings without an author or license fail the build", () => {
  assert.deepEqual(uncredited({ "es:noche": { src: "a", file: "f", license: "CC BY 2.0 fr" }, "de:Bier": { src: "a", file: "f", license: "Public domain" }, "fr:nuit": { src: "a", file: "f", license: "CC BY-SA 3.0", by: "X" } }), ["es:noche"]);
});

test("every stored recording names its author or is public domain", () => {
  assert.deepEqual(uncredited(readAudio()), []);
});

test("authors come from the file page when the metadata has none", () => {
  assert.equal(authorFromWikitext("Russian pronunciation.<br/>Audio sample provided by [[Commons:Shtooka|The Shtooka Project]].{{Cc-by-2.0-fr}}"), "The Shtooka Project");
  assert.equal(authorFromWikitext("*'''Who:''' [[User:Pill|Pill]]\n"), "Pill");
  assert.equal(authorFromWikitext("{{Information|author=Own work}}"), undefined);
  assert.equal(credit({ LicenseShortName: { value: "CC BY-SA 3.0" }, Categories: { value: "Self-published work|PD-self" } }, "Pajz").by, "Pajz");
});
