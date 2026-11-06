import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { BCP47, bcp47, commonsFileUrl, pickSource, pickVoice, play, playAll, playable, resetPlayer, snapshot, stop, type SpeakItem } from "./speak";
import { LANGS, WORDS, word } from "./words";
import { capPx, fitPx, glyphWidth, graphemes, longestToken } from "./tile-fit";
import { WordView } from "../app/(site)/word/views";

const voices = [
  { lang: "en-US", name: "Samantha" },
  { lang: "es-MX", name: "Paulina" },
  { lang: "es-ES", name: "Monica" },
  { lang: "iw-IL", name: "Carmit" },
  { lang: "fr_FR", name: "Thomas" },
];

test("every word language has a BCP-47 tag", () => {
  for (const code of Object.keys(LANGS)) assert.ok(BCP47[code], code);
  assert.equal(bcp47("ja"), "ja-JP");
  assert.equal(bcp47("xx"), "xx");
});

test("a voice for the exact tag wins over one for the same language", () => {
  assert.equal(pickVoice(voices, "es-ES")?.name, "Monica");
  assert.equal(pickVoice(voices, "es-AR")?.name, "Paulina");
  assert.equal(pickVoice(voices, "fr-FR")?.name, "Thomas");
  assert.equal(pickVoice(voices, "he-IL")?.name, "Carmit");
});

test("Ancient Greek does not borrow a modern Greek voice", () => {
  assert.equal(pickVoice([{ lang: "el-GR", name: "Melina" }], "grc"), undefined);
});

test("a recording comes first and keeps a voice to fall back on", () => {
  const src = "https://upload.wikimedia.org/x.mp3";
  assert.deepEqual(pickSource({ lang: "es-ES", src }, voices), { kind: "recording", src, voice: voices[2] });
  assert.deepEqual(pickSource({ lang: "la", src }, voices), { kind: "recording", src, voice: undefined });
});

test("without a recording the matching voice speaks", () => {
  assert.deepEqual(pickSource({ lang: "en-US" }, voices), { kind: "voice", voice: voices[0] });
});

test("the button hides when there is no recording and no voice", () => {
  for (const lang of ["la", "grc", "sa-IN", "ang"]) assert.equal(playable({ lang }, voices), false, lang);
  assert.equal(playable({ lang: "la", src: "https://upload.wikimedia.org/x.mp3" }, []), true);
  assert.equal(playable({ lang: "ja-JP" }, []), false);
});

test("commons file links use underscores and escape the name", () => {
  assert.equal(commonsFileUrl("LL-Q1321 (spa)-x-noche.wav"), "https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-x-noche.wav");
});

test("word pages render a whole-tile play button for each recording and credit it", () => {
  const night = word("night")!;
  const html = renderToStaticMarkup(<WordView w={night} code="es" />);
  const recorded = night.forms.filter((f) => f.audio);
  const buttons = html.match(/<button type="button"[^>]*aria-label="Escuchar [^"]+"/g) ?? [];
  assert.equal(buttons.length, recorded.length);
  if (recorded.length > 0) {
    assert.match(html, /Grabaciones de Wikimedia Commons:/);
    for (const f of recorded) assert.ok(html.includes(`aria-label="Escuchar ${f.word}"`), f.lang);
  }
  assert.doesNotMatch(html, /<audio/);
});

test("every recording is a Commons mp3 with a license", () => {
  for (const w of WORDS)
    for (const f of w.forms) {
      if (!f.audio) continue;
      assert.match(f.audio.src, /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/.+\.mp3$/, `${w.slug} ${f.lang}`);
      assert.ok(f.audio.license && f.audio.file, `${w.slug} ${f.lang}`);
    }
});

test("tile words fit on one line from grapheme length with a floor", () => {
  assert.equal(graphemes("بُنِّيّ"), 3);
  assert.equal(longestToken("pomme de terre"), 5);
  assert.equal(glyphWidth("茶色い"), 1.05);
  assert.equal(glyphWidth("коричневый"), 0.68);
  assert.equal(glyphWidth("உருளைக்கிழங்கு"), 2);
  assert.equal(capPx("màu da cam"), 24);
  assert.equal(fitPx("brun", 140), 40);
  assert.ok(fitPx("коричневый", 140) * 10 * 0.68 <= 140);
  assert.equal(fitPx("vaaleanpunainenvaaleanpunainen", 140), 10);
});

class FakeAudio {
  static made = 0;
  static next: "ok" | "reject" = "ok";
  src = "";
  preload = "";
  paused = true;
  plays: string[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeAudio.made++;
    audios.push(this);
  }
  play() {
    this.plays.push(this.src);
    if (FakeAudio.next === "reject") return Promise.reject(new Error("blocked"));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

const audios: FakeAudio[] = [];
const spoken: { text: string; voice: unknown; onend?: () => void; onerror?: () => void }[] = [];
let cancels = 0;
const fakeVoices = [{ lang: "es-ES", name: "Monica" }];

function installFakes() {
  const g = globalThis as Record<string, unknown>;
  g.Audio = FakeAudio;
  g.SpeechSynthesisUtterance = class {
    text: string;
    voice: unknown;
    lang = "";
    rate = 1;
    onend?: () => void;
    onerror?: () => void;
    constructor(text: string) {
      this.text = text;
    }
  };
  g.window = {
    speechSynthesis: {
      getVoices: () => fakeVoices,
      speak: (u: (typeof spoken)[number]) => spoken.push(u),
      cancel: () => {
        cancels++;
        for (const u of spoken.splice(0)) u.onerror?.();
      },
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const noche: SpeakItem = { id: "es", text: "noche", lang: "es-ES", src: "https://upload.wikimedia.org/noche.mp3" };
const nuit: SpeakItem = { id: "fr", text: "nuit", lang: "fr-FR", src: "https://upload.wikimedia.org/nuit.mp3" };

test("a blocked recording falls back to the matching voice", async () => {
  installFakes();
  resetPlayer();
  FakeAudio.next = "reject";
  const done = play(noche);
  await tick();
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "noche");
  assert.deepEqual(spoken[0].voice, fakeVoices[0]);
  assert.equal(snapshot().id, "es");
  spoken[0].onend?.();
  await done;
  assert.equal(snapshot().id, null);
  FakeAudio.next = "ok";
});

test("a new tap stops the sound that is playing", async () => {
  installFakes();
  resetPlayer();
  const first = play(noche);
  await tick();
  void play(nuit);
  await first;
  assert.equal(snapshot().id, "fr");
  const el = audios[audios.length - 1];
  assert.equal(el.src, nuit.src);
  assert.deepEqual(el.plays.slice(-2), [noche.src, nuit.src]);
  stop();
});

test("stop silences audio and speech and clears the state", async () => {
  installFakes();
  resetPlayer();
  const before = cancels;
  void play(noche);
  await tick();
  const el = audios[audios.length - 1];
  assert.equal(el.paused, false);
  stop();
  assert.equal(el.paused, true);
  assert.ok(cancels > before);
  assert.deepEqual(snapshot(), { id: null, all: false });
});

test("hear all reuses one audio element so iOS keeps the unlock from the tap", async () => {
  installFakes();
  resetPlayer();
  const made = FakeAudio.made;
  const all = playAll([noche, nuit]);
  await tick();
  assert.deepEqual(snapshot(), { id: "es", all: true });
  const el = audios[audios.length - 1];
  el.onended?.();
  await new Promise((r) => setTimeout(r, 300));
  assert.deepEqual(snapshot(), { id: "fr", all: true });
  assert.equal(el.src, nuit.src);
  el.onended?.();
  await all;
  assert.equal(FakeAudio.made - made, 1);
  assert.deepEqual(snapshot(), { id: null, all: false });
});

