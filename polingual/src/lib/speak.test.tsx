import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { BCP47, bcp47, commonsFileUrl, pickSource, pickVoice, play, playAll, playable, reasonFor, resetPlayer, say, snapshot, START_MS, stationAudio, stop, CUT_GAP_MS, cancelSpeech, estimateMs, FINISH_MS, SETTLE_MS, type SpeakItem } from "./speak";
import { LANGS, WORDS, word } from "./words";
import { graphemes, longestToken } from "./tile-fit";
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

test("grapheme counts merge combining marks and phrases use the longest token", () => {
  assert.equal(graphemes("بُنِّيّ"), 3);
  assert.equal(longestToken("pomme de terre"), 5);
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
  await new Promise((r) => setTimeout(r, CUT_GAP_MS + 120));
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


test("rapid taps each start their word and the last tap holds the player", async () => {
  installFakes();
  resetPlayer();
  const before = spoken.length;
  const words = ["uno", "dos", "tres", "cuatro", "cinco"];
  const runs = words.map((w, i) => play({ id: `t${i}`, text: w, lang: "es-ES" }));
  await tick();
  await new Promise((r) => setTimeout(r, CUT_GAP_MS + 120));
  const said = spoken.slice(before).map((u) => u.text);
  assert.equal(said[said.length - 1], "cinco");
  assert.ok(!said.slice(0, -1).includes("cinco"));
  assert.equal(snapshot().id, "t4");
  stop();
  await Promise.all(runs);
});

test("a tap on a language with no voice explains why at once", async () => {
  installFakes();
  resetPlayer();
  assert.equal(reasonFor({ lang: "ja-JP" }), "This device has no Japanese voice.");
  await play({ id: "ja", text: "猫", lang: "ja-JP" });
  assert.equal(snapshot().notice, "This device has no Japanese voice.");
});

test("a tap that makes no sound within 300 ms shows a reason", async () => {
  installFakes();
  resetPlayer();
  const run = play({ id: "q", text: "silencio", lang: "es-ES" });
  await new Promise((r) => setTimeout(r, START_MS + 200));
  assert.match(snapshot().notice ?? "", /No sound yet/);
  stop();
  await run;
});

test("automatic audio stays quiet in silent mode while a tap still speaks", async () => {
  installFakes();
  resetPlayer();
  const before = spoken.length;
  say("hola", "es-ES", { auto: true, silent: true });
  await tick();
  assert.equal(spoken.length, before);
  say("hola", "es-ES", { silent: true });
  await tick();
  assert.equal(spoken.length, before + 1);
  stop();
});

test("a word tap ducks the radio station and restores it after", async () => {
  installFakes();
  resetPlayer();
  const st = stationAudio() as unknown as { paused: boolean; volume: number };
  st.paused = false;
  st.volume = 1;
  const run = play({ id: "d", text: "uno", lang: "es-ES" });
  await tick();
  assert.equal(st.volume, 0.15);
  spoken[spoken.length - 1].onend?.();
  await run;
  assert.equal(st.volume, 1);
});

test("a word under 1.5 s from done finishes, then only the latest tap plays", async () => {
  installFakes();
  resetPlayer();
  const before = spoken.length;
  void play({ id: "a", text: "sí", lang: "es-ES" });
  await tick();
  const first = spoken[spoken.length - 1] as { text: string; onend?: () => void; onstart?: () => void };
  first.onstart?.();
  assert.ok(estimateMs("sí") <= FINISH_MS);
  void play({ id: "b", text: "dos", lang: "es-ES" });
  void play({ id: "c", text: "tres", lang: "es-ES" });
  await tick();
  assert.equal(spoken.length, before + 1);
  first.onend?.();
  await tick();
  await tick();
  assert.deepEqual(spoken.slice(before).map((u) => u.text), ["sí", "tres"]);
  stop();
});

test("a long word is cut by a new tap and nothing stale plays after cancel", async () => {
  installFakes();
  resetPlayer();
  const before = spoken.length;
  void play({ id: "a", text: "a very long sentence that keeps speaking for a while", lang: "es-ES" });
  await tick();
  (spoken[spoken.length - 1] as { onstart?: () => void }).onstart?.();
  const cut = cancels;
  void play({ id: "b", text: "corta", lang: "es-ES" });
  assert.equal(cancels, cut + 1);
  cancelSpeech();
  await new Promise((r) => setTimeout(r, CUT_GAP_MS + 130));
  assert.ok(!spoken.slice(before).some((u) => u.text === "corta"));
  assert.equal(snapshot().id, null);
});

test("an unducked word ending never restores the station early", async () => {
  installFakes();
  resetPlayer();
  const st = stationAudio() as unknown as { paused: boolean; volume: number };
  st.paused = true;
  st.volume = 0.7;
  const a = play({ id: "a", text: "a long phrase that keeps speaking on and on", lang: "es-ES" });
  await tick();
  (spoken[spoken.length - 1] as { onstart?: () => void }).onstart?.();
  st.paused = false;
  const b = play({ id: "b", text: "otra palabra bastante larga para cortar", lang: "es-ES" });
  await a;
  await new Promise((r) => setTimeout(r, CUT_GAP_MS + 120));
  assert.equal(st.volume, 0.15);
  spoken[spoken.length - 1].onend?.();
  await b;
  assert.equal(st.volume, 0.7);
});

test("turning silent mode on cuts the word that is speaking", async () => {
  installFakes();
  resetPlayer();
  const mem = new Map<string, string>();
  (globalThis as unknown as { window: Record<string, unknown> }).window.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  (globalThis as unknown as { window: Record<string, unknown> }).window.addEventListener = () => undefined;
  (globalThis as unknown as { window: Record<string, unknown> }).window.removeEventListener = () => undefined;
  void play({ id: "s", text: "silencio por favor", lang: "es-ES" });
  await tick();
  const { setSilent } = await import("./silent");
  const before = cancels;
  setSilent(true);
  assert.equal(cancels, before + 1);
  assert.equal(snapshot().id, null);
  setSilent(false);
});

test("a queued word never waits more than the settle time on a stuck one", async () => {
  installFakes();
  resetPlayer();
  void play({ id: "a", text: "sí", lang: "es-ES" });
  await tick();
  (spoken[spoken.length - 1] as { onstart?: () => void }).onstart?.();
  void play({ id: "b", text: "luego", lang: "es-ES" });
  await tick();
  assert.notEqual(spoken[spoken.length - 1].text, "luego");
  await new Promise((r) => setTimeout(r, SETTLE_MS + CUT_GAP_MS + 300));
  assert.equal(spoken[spoken.length - 1].text, "luego");
  stop();
});
