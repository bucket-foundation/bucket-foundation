import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const WATCH = path.resolve(__dirname, "..", "polingual", "public", "watch");
const LANGS = "en es fr it pt de nl sv pl fi ru el ar hi ja zh ko he fa tr cs id vi th ta".split(" ");
const CREDIT = "(CC) Blender Foundation | studio.blender.org";

type Cue = { id: string; start: number; end: number; text: string };
type Film = {
  id: string;
  title: Record<string, string>;
  duration: number;
  license: string;
  credit: string;
  source: string;
  licenseUrl: string;
  video: string | null;
  poster: string;
  langs: string[];
  cues: number;
  translation: string;
  updated: string;
};

function seconds(stamp: string): number {
  const m = /^(\d\d):(\d\d):(\d\d)\.(\d\d\d)$/.exec(stamp.trim());
  assert.ok(m, `bad timestamp ${stamp}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

function parse(file: string): Cue[] {
  const text = fs.readFileSync(file, "utf8");
  assert.ok(text.startsWith("WEBVTT\n"), `${file} lacks the WEBVTT header`);
  return text
    .split("\n\n")
    .slice(1)
    .filter((b) => b.trim())
    .map((block) => {
      const lines = block.split("\n").filter((l) => l !== "");
      assert.ok(lines.length >= 3, `${file}: short cue ${JSON.stringify(block)}`);
      const [a, b] = lines[1].split(" --> ");
      return { id: lines[0], start: seconds(a), end: seconds(b), text: lines.slice(2).join("\n") };
    });
}

const index = JSON.parse(fs.readFileSync(path.join(WATCH, "index.json"), "utf8")) as { version: number; films: Film[] };

test("index lists Tears of Steel and Sintel with every field", () => {
  assert.equal(index.version, 1);
  assert.deepEqual(index.films.map((f) => f.id), ["tears-of-steel", "sintel"]);
  for (const f of index.films) {
    assert.equal(f.credit, CREDIT);
    assert.match(f.license, /^CC BY/);
    assert.ok(f.duration > 600 && f.duration < 1200, `${f.id} duration ${f.duration}`);
    assert.equal(f.licenseUrl, "https://creativecommons.org/licenses/by/3.0/");
    if (f.video !== null) assert.match(f.video, /^https:\/\/download\.blender\.org\//);
    assert.match(f.poster, /^https:\/\/www\.polingual\.com\/watch\//);
    assert.match(f.source, /^https:\/\/studio\.blender\.org\//);
    assert.match(f.updated, /^\d{4}-\d\d-\d\d$/);
    assert.equal(f.translation, "machine");
    assert.deepEqual(f.langs, LANGS);
    for (const l of LANGS) assert.ok(f.title[l]?.trim(), `${f.id} title ${l}`);
    assert.ok(fs.existsSync(path.join(WATCH, f.id, "poster.jpg")), `${f.id} poster`);
  }
});

for (const film of index.films) {
  test(`${film.id}: every language has the same cues and timings as English`, () => {
    const en = parse(path.join(WATCH, film.id, "en.vtt"));
    assert.equal(en.length, film.cues);
    for (const lang of film.langs) {
      const cues = parse(path.join(WATCH, film.id, `${lang}.vtt`));
      assert.equal(cues.length, en.length, `${film.id}/${lang} cue count`);
      cues.forEach((c, i) => {
        assert.equal(c.id, String(i + 1), `${film.id}/${lang} cue id ${i}`);
        assert.equal(c.start, en[i].start, `${film.id}/${lang} cue ${i + 1} start`);
        assert.equal(c.end, en[i].end, `${film.id}/${lang} cue ${i + 1} end`);
        assert.ok(c.text.trim(), `${film.id}/${lang} cue ${i + 1} empty`);
        assert.ok(!/[<>]|&(?!amp;|lt;|gt;)/.test(c.text), `${film.id}/${lang} cue ${i + 1} unescaped markup`);
      });
      if (lang !== "en") {
        const same = cues.filter((c, i) => c.text === en[i].text.replace(/\n/g, " ")).length;
        assert.ok(same <= en.length * 0.2, `${film.id}/${lang} has ${same} cues left in English`);
      }
    }
  });

  test(`${film.id}: timings run forward inside the film`, () => {
    const en = parse(path.join(WATCH, film.id, "en.vtt"));
    en.forEach((c, i) => {
      assert.ok(c.start < c.end, `cue ${i + 1} ends before it starts`);
      if (i > 0) assert.ok(c.start >= en[i - 1].start, `cue ${i + 1} out of order`);
    });
    assert.ok(en[en.length - 1].end <= film.duration, "last cue past the end");
  });
}

test("Tears of Steel streams from Blender and Sintel waits for its own host", () => {
  const video = Object.fromEntries(index.films.map((f) => [f.id, f.video]));
  assert.equal(video["tears-of-steel"], "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov");
  assert.equal(video["sintel"], null);
});

test("no video files in the watch folder", () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [e.name]));
  const video = walk(WATCH).filter((n) => /\.(mp4|mov|mkv|webm|m4v|ts|m3u8)$/i.test(n));
  assert.deepEqual(video, []);
});
