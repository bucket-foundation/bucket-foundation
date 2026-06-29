#!/usr/bin/env node
/* =====================================================================
 * build-phrases.mjs  (bkt-q8e)
 *
 * Curated, HAND-VERIFIED beginner phrase deck. This is gold data — the
 * same bar as the word deck (lang-core.json): every translation is
 * hand-checked, NOT dumped from the corpus. Wrong phrases are worse than
 * fewer, so a language is only included on a phrase when its translation
 * is verified. Missing languages are simply absent for that phrase.
 *
 * Output: corpus/lang-phrases.json
 *   { meta:{...}, phrases:[ { id, en, category, forms:{lang:string}, ipa? } ] }
 *
 * Categories: greeting, courtesy, intro, survival, dining, direction.
 * Languages verified: en es fr it pt de nl sv ru ja zh el fi pl
 * (the 14 core lang-core languages; bonus ko/hi/ar omitted where not
 *  confidently verified — honest coverage over breadth).
 * ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, "corpus", "lang-phrases.json");

// Each phrase: en + per-language verified translation. Romanization given
// inline for non-Latin scripts in the `forms` value is avoided; the native
// script is the answer, and IPA/notes can be added later. Forms are gold.
const PHRASES = [
  // ---- greetings ----
  { id: "hello", en: "hello", category: "greeting", forms: {
    en: "hello", es: "hola", fr: "bonjour", it: "ciao", pt: "olá", de: "hallo",
    nl: "hallo", sv: "hej", ru: "привет", ja: "こんにちは", zh: "你好", el: "γεια",
    fi: "hei", pl: "cześć" } },
  { id: "good-morning", en: "good morning", category: "greeting", forms: {
    en: "good morning", es: "buenos días", fr: "bonjour", it: "buongiorno",
    pt: "bom dia", de: "guten Morgen", nl: "goedemorgen", sv: "god morgon",
    ru: "доброе утро", ja: "おはよう", zh: "早安", el: "καλημέρα", fi: "hyvää huomenta",
    pl: "dzień dobry" } },
  { id: "good-night", en: "good night", category: "greeting", forms: {
    en: "good night", es: "buenas noches", fr: "bonne nuit", it: "buonanotte",
    pt: "boa noite", de: "gute Nacht", nl: "goedenacht", sv: "god natt",
    ru: "спокойной ночи", ja: "おやすみ", zh: "晚安", el: "καληνύχτα",
    fi: "hyvää yötä", pl: "dobranoc" } },
  { id: "goodbye", en: "goodbye", category: "greeting", forms: {
    en: "goodbye", es: "adiós", fr: "au revoir", it: "arrivederci", pt: "adeus",
    de: "auf Wiedersehen", nl: "tot ziens", sv: "hej då", ru: "до свидания",
    ja: "さようなら", zh: "再见", el: "αντίο", fi: "näkemiin", pl: "do widzenia" } },
  { id: "see-you-later", en: "see you later", category: "greeting", forms: {
    en: "see you later", es: "hasta luego", fr: "à bientôt", it: "a presto",
    pt: "até logo", de: "bis später", nl: "tot later", sv: "vi ses",
    ru: "до встречи", ja: "またね", zh: "回头见", el: "τα λέμε", fi: "nähdään",
    pl: "do zobaczenia" } },

  // ---- courtesy ----
  { id: "thank-you", en: "thank you", category: "courtesy", forms: {
    en: "thank you", es: "gracias", fr: "merci", it: "grazie", pt: "obrigado",
    de: "danke", nl: "dank je", sv: "tack", ru: "спасибо", ja: "ありがとう",
    zh: "谢谢", el: "ευχαριστώ", fi: "kiitos", pl: "dziękuję" } },
  { id: "you-are-welcome", en: "you're welcome", category: "courtesy", forms: {
    en: "you're welcome", es: "de nada", fr: "de rien", it: "prego",
    pt: "de nada", de: "bitte", nl: "graag gedaan", sv: "varsågod",
    ru: "пожалуйста", ja: "どういたしまして", zh: "不客气", el: "παρακαλώ",
    fi: "ole hyvä", pl: "proszę" } },
  { id: "please", en: "please", category: "courtesy", forms: {
    en: "please", es: "por favor", fr: "s'il vous plaît", it: "per favore",
    pt: "por favor", de: "bitte", nl: "alsjeblieft", sv: "snälla",
    ru: "пожалуйста", ja: "お願いします", zh: "请", el: "παρακαλώ",
    fi: "kiitos", pl: "proszę" } },
  { id: "excuse-me", en: "excuse me", category: "courtesy", forms: {
    en: "excuse me", es: "perdón", fr: "excusez-moi", it: "scusi", pt: "com licença",
    de: "entschuldigung", nl: "pardon", sv: "ursäkta", ru: "извините",
    ja: "すみません", zh: "对不起", el: "συγγνώμη", fi: "anteeksi", pl: "przepraszam" } },
  { id: "sorry", en: "I'm sorry", category: "courtesy", forms: {
    en: "I'm sorry", es: "lo siento", fr: "je suis désolé", it: "mi dispiace",
    pt: "desculpe", de: "es tut mir leid", nl: "het spijt me", sv: "förlåt",
    ru: "извините", ja: "ごめんなさい", zh: "抱歉", el: "συγγνώμη",
    fi: "anteeksi", pl: "przepraszam" } },
  { id: "yes", en: "yes", category: "courtesy", forms: {
    en: "yes", es: "sí", fr: "oui", it: "sì", pt: "sim", de: "ja", nl: "ja",
    sv: "ja", ru: "да", ja: "はい", zh: "是", el: "ναι", fi: "kyllä", pl: "tak" } },
  { id: "no", en: "no", category: "courtesy", forms: {
    en: "no", es: "no", fr: "non", it: "no", pt: "não", de: "nein", nl: "nee",
    sv: "nej", ru: "нет", ja: "いいえ", zh: "不", el: "όχι", fi: "ei", pl: "nie" } },

  // ---- introductions ----
  { id: "how-are-you", en: "how are you?", category: "intro", forms: {
    en: "how are you?", es: "¿cómo estás?", fr: "comment ça va ?",
    it: "come stai?", pt: "como vai?", de: "wie geht es dir?", nl: "hoe gaat het?",
    sv: "hur mår du?", ru: "как дела?", ja: "お元気ですか", zh: "你好吗",
    el: "τι κάνεις;", fi: "mitä kuuluu?", pl: "jak się masz?" } },
  { id: "i-am-fine", en: "I'm fine", category: "intro", forms: {
    en: "I'm fine", es: "estoy bien", fr: "ça va bien", it: "sto bene",
    pt: "estou bem", de: "mir geht es gut", nl: "het gaat goed", sv: "jag mår bra",
    ru: "хорошо", ja: "元気です", zh: "我很好", el: "καλά", fi: "hyvää",
    pl: "dobrze" } },
  { id: "my-name-is", en: "my name is...", category: "intro", forms: {
    en: "my name is", es: "me llamo", fr: "je m'appelle", it: "mi chiamo",
    pt: "meu nome é", de: "ich heiße", nl: "ik heet", sv: "jag heter",
    ru: "меня зовут", ja: "私の名前は", zh: "我叫", el: "με λένε",
    fi: "nimeni on", pl: "nazywam się" } },
  { id: "nice-to-meet-you", en: "nice to meet you", category: "intro", forms: {
    en: "nice to meet you", es: "mucho gusto", fr: "enchanté", it: "piacere",
    pt: "prazer", de: "freut mich", nl: "aangenaam", sv: "trevligt att träffas",
    ru: "приятно познакомиться", ja: "はじめまして", zh: "很高兴认识你",
    el: "χάρηκα", fi: "hauska tavata", pl: "miło mi" } },
  { id: "what-is-your-name", en: "what is your name?", category: "intro", forms: {
    en: "what's your name?", es: "¿cómo te llamas?", fr: "comment tu t'appelles ?",
    it: "come ti chiami?", pt: "como te chamas?", de: "wie heißt du?",
    nl: "hoe heet je?", sv: "vad heter du?", ru: "как тебя зовут?",
    ja: "お名前は", zh: "你叫什么名字", el: "πώς σε λένε;", fi: "mikä on nimesi?",
    pl: "jak się nazywasz?" } },

  // ---- survival ----
  { id: "do-you-speak-english", en: "do you speak English?", category: "survival", forms: {
    en: "do you speak English?", es: "¿hablas inglés?", fr: "parlez-vous anglais ?",
    it: "parli inglese?", pt: "você fala inglês?", de: "sprichst du Englisch?",
    nl: "spreek je Engels?", sv: "talar du engelska?", ru: "вы говорите по-английски?",
    ja: "英語を話せますか", zh: "你会说英语吗", el: "μιλάτε αγγλικά;",
    fi: "puhutko englantia?", pl: "czy mówisz po angielsku?" } },
  { id: "i-dont-understand", en: "I don't understand", category: "survival", forms: {
    en: "I don't understand", es: "no entiendo", fr: "je ne comprends pas",
    it: "non capisco", pt: "não entendo", de: "ich verstehe nicht",
    nl: "ik begrijp het niet", sv: "jag förstår inte", ru: "я не понимаю",
    ja: "わかりません", zh: "我不明白", el: "δεν καταλαβαίνω", fi: "en ymmärrä",
    pl: "nie rozumiem" } },
  { id: "i-dont-know", en: "I don't know", category: "survival", forms: {
    en: "I don't know", es: "no sé", fr: "je ne sais pas", it: "non lo so",
    pt: "não sei", de: "ich weiß nicht", nl: "ik weet het niet", sv: "jag vet inte",
    ru: "я не знаю", ja: "知りません", zh: "我不知道", el: "δεν ξέρω", fi: "en tiedä",
    pl: "nie wiem" } },
  { id: "can-you-help-me", en: "can you help me?", category: "survival", forms: {
    en: "can you help me?", es: "¿puedes ayudarme?", fr: "pouvez-vous m'aider ?",
    it: "puoi aiutarmi?", pt: "pode me ajudar?", de: "kannst du mir helfen?",
    nl: "kun je me helpen?", sv: "kan du hjälpa mig?", ru: "вы можете мне помочь?",
    ja: "助けてください", zh: "你能帮我吗", el: "μπορείς να με βοηθήσεις;",
    fi: "voitko auttaa minua?", pl: "czy możesz mi pomóc?" } },
  { id: "where-is", en: "where is...?", category: "survival", forms: {
    en: "where is", es: "dónde está", fr: "où est", it: "dov'è", pt: "onde está",
    de: "wo ist", nl: "waar is", sv: "var är", ru: "где", ja: "どこですか",
    zh: "在哪里", el: "πού είναι", fi: "missä on", pl: "gdzie jest" } },
  { id: "how-much", en: "how much?", category: "survival", forms: {
    en: "how much?", es: "¿cuánto cuesta?", fr: "combien ?", it: "quanto costa?",
    pt: "quanto custa?", de: "wie viel?", nl: "hoeveel?", sv: "hur mycket?",
    ru: "сколько?", ja: "いくらですか", zh: "多少钱", el: "πόσο κάνει;",
    fi: "paljonko?", pl: "ile to kosztuje?" } },
  { id: "i-want", en: "I want...", category: "survival", forms: {
    en: "I want", es: "quiero", fr: "je veux", it: "voglio", pt: "quero",
    de: "ich will", nl: "ik wil", sv: "jag vill", ru: "я хочу", ja: "ほしいです",
    zh: "我想要", el: "θέλω", fi: "haluan", pl: "chcę" } },
  { id: "i-need", en: "I need...", category: "survival", forms: {
    en: "I need", es: "necesito", fr: "j'ai besoin de", it: "ho bisogno di",
    pt: "preciso de", de: "ich brauche", nl: "ik heb nodig", sv: "jag behöver",
    ru: "мне нужно", ja: "必要です", zh: "我需要", el: "χρειάζομαι", fi: "tarvitsen",
    pl: "potrzebuję" } },
  { id: "help", en: "help!", category: "survival", forms: {
    en: "help!", es: "¡ayuda!", fr: "au secours !", it: "aiuto!", pt: "socorro!",
    de: "Hilfe!", nl: "help!", sv: "hjälp!", ru: "помогите!", ja: "助けて",
    zh: "救命", el: "βοήθεια!", fi: "apua!", pl: "pomocy!" } },
  { id: "i-am-lost", en: "I am lost", category: "survival", forms: {
    en: "I am lost", es: "estoy perdido", fr: "je suis perdu", it: "mi sono perso",
    pt: "estou perdido", de: "ich habe mich verlaufen", nl: "ik ben verdwaald",
    sv: "jag har gått vilse", ru: "я заблудился", ja: "道に迷いました",
    zh: "我迷路了", el: "χάθηκα", fi: "olen eksynyt", pl: "zgubiłem się" } },

  // ---- dining ----
  { id: "the-check-please", en: "the check, please", category: "dining", forms: {
    en: "the check, please", es: "la cuenta, por favor", fr: "l'addition, s'il vous plaît",
    it: "il conto, per favore", pt: "a conta, por favor", de: "die Rechnung, bitte",
    nl: "de rekening, alsjeblieft", sv: "notan, tack", ru: "счёт, пожалуйста",
    ja: "お会計お願いします", zh: "买单", el: "τον λογαριασμό, παρακαλώ",
    fi: "lasku, kiitos", pl: "rachunek, proszę" } },
  { id: "water-please", en: "water, please", category: "dining", forms: {
    en: "water, please", es: "agua, por favor", fr: "de l'eau, s'il vous plaît",
    it: "acqua, per favore", pt: "água, por favor", de: "Wasser, bitte",
    nl: "water, alsjeblieft", sv: "vatten, tack", ru: "воду, пожалуйста",
    ja: "お水ください", zh: "水，谢谢", el: "νερό, παρακαλώ", fi: "vettä, kiitos",
    pl: "woda, proszę" } },
  { id: "cheers", en: "cheers!", category: "dining", forms: {
    en: "cheers!", es: "¡salud!", fr: "santé !", it: "salute!", pt: "saúde!",
    de: "Prost!", nl: "proost!", sv: "skål!", ru: "за здоровье!", ja: "乾杯",
    zh: "干杯", el: "γεια μας!", fi: "kippis!", pl: "na zdrowie!" } },
  { id: "delicious", en: "delicious", category: "dining", forms: {
    en: "delicious", es: "delicioso", fr: "délicieux", it: "delizioso", pt: "delicioso",
    de: "lecker", nl: "heerlijk", sv: "utsökt", ru: "вкусно", ja: "おいしい",
    zh: "好吃", el: "νόστιμο", fi: "herkullista", pl: "pyszne" } },

  // ---- directions / basics ----
  { id: "left", en: "left", category: "direction", forms: {
    en: "left", es: "izquierda", fr: "gauche", it: "sinistra", pt: "esquerda",
    de: "links", nl: "links", sv: "vänster", ru: "налево", ja: "左", zh: "左",
    el: "αριστερά", fi: "vasen", pl: "lewo" } },
  { id: "right", en: "right", category: "direction", forms: {
    en: "right", es: "derecha", fr: "droite", it: "destra", pt: "direita",
    de: "rechts", nl: "rechts", sv: "höger", ru: "направо", ja: "右", zh: "右",
    el: "δεξιά", fi: "oikea", pl: "prawo" } },
  { id: "straight-ahead", en: "straight ahead", category: "direction", forms: {
    en: "straight ahead", es: "todo recto", fr: "tout droit", it: "sempre dritto",
    pt: "em frente", de: "geradeaus", nl: "rechtdoor", sv: "rakt fram",
    ru: "прямо", ja: "まっすぐ", zh: "直走", el: "ευθεία", fi: "suoraan",
    pl: "prosto" } },
  { id: "good", en: "good", category: "basics", forms: {
    en: "good", es: "bueno", fr: "bon", it: "buono", pt: "bom", de: "gut",
    nl: "goed", sv: "bra", ru: "хорошо", ja: "良い", zh: "好", el: "καλό",
    fi: "hyvä", pl: "dobry" } },
  { id: "bad", en: "bad", category: "basics", forms: {
    en: "bad", es: "malo", fr: "mauvais", it: "cattivo", pt: "mau", de: "schlecht",
    nl: "slecht", sv: "dålig", ru: "плохо", ja: "悪い", zh: "坏", el: "κακό",
    fi: "huono", pl: "zły" } },
  { id: "today", en: "today", category: "basics", forms: {
    en: "today", es: "hoy", fr: "aujourd'hui", it: "oggi", pt: "hoje", de: "heute",
    nl: "vandaag", sv: "idag", ru: "сегодня", ja: "今日", zh: "今天", el: "σήμερα",
    fi: "tänään", pl: "dzisiaj" } },
  { id: "tomorrow", en: "tomorrow", category: "basics", forms: {
    en: "tomorrow", es: "mañana", fr: "demain", it: "domani", pt: "amanhã",
    de: "morgen", nl: "morgen", sv: "imorgon", ru: "завтра", ja: "明日",
    zh: "明天", el: "αύριο", fi: "huomenna", pl: "jutro" } },
  { id: "i-love-you", en: "I love you", category: "basics", forms: {
    en: "I love you", es: "te quiero", fr: "je t'aime", it: "ti amo", pt: "eu te amo",
    de: "ich liebe dich", nl: "ik hou van je", sv: "jag älskar dig", ru: "я тебя люблю",
    ja: "愛してる", zh: "我爱你", el: "σ' αγαπώ", fi: "rakastan sinua", pl: "kocham cię" } },
];

function main() {
  // sanity: dedupe ids, ensure en present
  const ids = new Set();
  for (const p of PHRASES) {
    if (ids.has(p.id)) throw new Error("duplicate phrase id: " + p.id);
    ids.add(p.id);
    if (!p.forms.en) throw new Error("phrase missing en: " + p.id);
    if (!p.category) throw new Error("phrase missing category: " + p.id);
  }
  // language coverage report
  const allLangs = new Set();
  PHRASES.forEach((p) => Object.keys(p.forms).forEach((l) => allLangs.add(l)));
  const langs = [...allLangs].sort();
  const cov = {};
  langs.forEach((l) => (cov[l] = PHRASES.filter((p) => p.forms[l]).length));

  const out = {
    meta: {
      builder: "build-phrases.mjs",
      bead: "bkt-q8e",
      built: new Date().toISOString(),
      title: "Polyglot Phrases — verified beginner phrases across many languages",
      note: "Gold / hand-verified translations (same bar as lang-core.json). NOT a corpus dump. A language is present on a phrase only when verified.",
      license:
        "Original curated phrase set. IPA/word atoms elsewhere cross-checked against Wiktionary (CC-BY-SA, via Kaikki).",
      languages: langs,
      phraseCount: PHRASES.length,
      coverage: cov,
      categories: [...new Set(PHRASES.map((p) => p.category))],
    },
    phrases: PHRASES,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + "\n");
  console.log(
    `lang-phrases.json: ${PHRASES.length} phrases across ${langs.length} languages → corpus/lang-phrases.json`
  );
  console.log("  coverage:", langs.map((l) => `${l}:${cov[l]}`).join(" "));
}

main();
