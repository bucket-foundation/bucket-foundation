import { test } from "node:test";
import assert from "node:assert/strict";
import { LANGS, WORDS } from "../words";
import { buildRoomSet, FAMILIES, familyCap, pickTheWord, ROUND_TIERS, roundTargets, seeded, shuffle, whichLanguage } from "./generators";
import { parseSettings, type RoomSettings } from "./questions";

const settings = parseSettings({ home: "en", targets: ["es", "fr", "de", "ru", "ja", "ar"] }) as RoomSettings;
const BY_SLUG = new Map(WORDS.map((w) => [w.slug, w]));
const formOf = (slug: string, lang: string) => BY_SLUG.get(slug)?.forms.find((f) => f.lang === lang)?.word;
const slugFor = (lang: string, word: string) => WORDS.find((w) => w.forms.some((f) => f.lang === lang && f.word === word));

test("the seeded generator replays the same numbers", () => {
  const a = seeded(42);
  const b = seeded(42);
  const xs = Array.from({ length: 5 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 5 }, () => b()));
  assert.deepEqual(xs.map((x) => Math.round(x * 1e6)), [601104, 448291, 852466, 669734, 174814]);
  assert.notDeepEqual(xs, Array.from({ length: 5 }, seeded(43)));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
});

test("a seed replays the same room set", () => {
  assert.deepEqual(buildRoomSet(7, settings), buildRoomSet(7, settings));
  assert.notDeepEqual(buildRoomSet(7, settings), buildRoomSet(8, settings));
});

test("a fixed seed yields a fixed first question", () => {
  const [q] = buildRoomSet(12345, settings)!;
  assert.deepEqual(Object.keys(q).sort(), ["answer", "idx", "kind", "options", "prompt", "round"]);
  const again = buildRoomSet(12345, settings)![0];
  assert.equal(JSON.stringify(q), JSON.stringify(again));
});

for (const seed of [1, 2, 3, 99, 2024, 31337, 2 ** 31 - 2]) {
  test(`seed ${seed} builds three rounds of five valid questions`, () => {
    const set = buildRoomSet(seed, settings)!;
    assert.equal(set.length, 15);
    assert.deepEqual(set.map((q) => q.idx), [...Array(15).keys()]);
    assert.deepEqual(set.map((q) => q.round), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3]);
    const prompts = new Set<string>();
    for (const q of set) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4, "options are distinct");
      assert.ok(q.answer >= 0 && q.answer <= 3);
      prompts.add(JSON.stringify(q.prompt));
      if (q.kind === "pick_word") {
        const lang = String(q.prompt.lang);
        assert.ok(settings.targets.includes(lang));
        const w = WORDS.find((x) => x.en === q.prompt.en && formOf(x.slug, lang) === q.options[q.answer]);
        assert.ok(w, "the answer is the prompt word in the target language");
        const [lo, hi] = ROUND_TIERS[q.round - 1];
        assert.ok(w.tier >= lo && w.tier <= hi, `tier ${w.tier} sits in round ${q.round}`);
        for (const opt of q.options) {
          const ok = WORDS.some((d) => d.category === w.category && Math.abs(d.tier - w.tier) <= 2 && d.forms.some((f) => f.lang === lang && f.word === opt));
          assert.ok(ok, `distractor ${opt} shares the category and tier band`);
        }
      } else {
        const lang = q.options[q.answer];
        assert.ok(settings.targets.includes(lang));
        const w = slugFor(lang, String(q.prompt.word));
        assert.ok(w, "the prompt is a word in the answer language");
        for (const l of q.options) {
          assert.ok(LANGS[l]);
          if (l !== lang) assert.notEqual(formOf(w.slug, l), q.prompt.word, `${l} does not share the word`);
        }
        assert.ok(!("lang" in q.prompt), "the prompt hides the language");
      }
    }
    assert.equal(prompts.size, 15, "no question repeats");
  });
}

test("pick the word keeps the answer out of the prompt", () => {
  const q = pickTheWord(BY_SLUG.get("eight")!, "es", settings, WORDS, seeded(1))!;
  assert.equal(q.options[q.answer], "ocho");
  assert.ok(!Object.values(q.prompt).includes("ocho"));
  assert.deepEqual(q.prompt, { en: "eight", home: "eight", home_lang: "en", lang: "es" });
});

test("pick the word gives the home-language prompt", () => {
  const es = parseSettings({ home: "es", targets: ["fr"] })!;
  const q = pickTheWord(BY_SLUG.get("eight")!, "fr", es, WORDS, seeded(1))!;
  assert.equal(q.prompt.home, "ocho");
  assert.equal(q.options[q.answer], "huit");
});

test("which language prefers distractors in the same script", () => {
  for (let s = 0; s < 20; s++) {
    const q = whichLanguage(BY_SLUG.get("eight")!, "es", seeded(s))!;
    assert.ok(q.options.every((l) => LANGS[l].script === "Latin"));
    const ar = whichLanguage(BY_SLUG.get("eight")!, "ar", seeded(s))!;
    assert.ok(ar.options.includes("fa"), "Persian shares the Arabic script");
  }
});

test("which language never offers a language that spells the word the same way", () => {
  for (let s = 0; s < 50; s++) {
    const q = whichLanguage(BY_SLUG.get("eight")!, "de", seeded(s))!;
    assert.equal(q.prompt.word, "acht");
    assert.ok(!q.options.includes("nl"));
  }
});

test("one family stays at 40% of a round when the host picks several", () => {
  assert.equal(familyCap(["es", "fr", "it"], 5), 5);
  assert.equal(familyCap(["es", "de", "ru"], 5), 2);
  assert.equal(familyCap(["es", "fr", "de"], 5), 3);
  for (let s = 0; s < 50; s++) {
    const picks = roundTargets(["es", "fr", "it", "pt", "de", "ru"], 5, seeded(s));
    assert.equal(picks.length, 5);
    assert.ok(picks.filter((t) => FAMILIES[t] === "romance").length <= 2, picks.join(","));
  }
  for (const seed of [5, 6, 7]) {
    const set = buildRoomSet(seed, parseSettings({ home: "en", targets: ["es", "fr", "it", "de", "ru", "ja"] })!)!;
    for (const round of [1, 2, 3]) {
      const langs = set.filter((q) => q.round === round).map((q) => (q.kind === "pick_word" ? String(q.prompt.lang) : q.options[q.answer]));
      assert.ok(langs.filter((l) => FAMILIES[l] === "romance").length <= 2, `round ${round}: ${langs.join(",")}`);
    }
  }
});

test("a single target language fills every question", () => {
  const set = buildRoomSet(3, parseSettings({ home: "en", targets: ["ja"] })!)!;
  assert.equal(set.length, 15);
});

test("shuffle keeps every item", () => {
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], seeded(9)).sort(), [1, 2, 3, 4, 5]);
});

test("room creation stores the generated set without leaking answers to the host reply", async () => {
  const { createRoom } = await import("./live");
  let stored: unknown[] = [];
  const env = { STOA_ROOM_SECRET: "g".repeat(40), POLINGUAL_DB_URL: "https://db.test", POLINGUAL_DB_SERVICE_KEY: "s", POLINGUAL_DB_ANON_KEY: "a" };
  const r = await createRoom("Bearer ok", { settings: { targets: ["es", "ja"] } }, {
    env,
    build: buildRoomSet,
    random: (max) => max >> 1,
    send: async () => Response.json({ id: "0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b" }),
    rpc: async (_fn, args) => {
      stored = args.p_questions as unknown[];
      return { data: { room_id: args.p_id, code: args.p_code, topic: "0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c0c", expires_at: Date.now() + 3_600_000, verify_key: args.p_verify_key } };
    },
  });
  assert.equal(r.status, 200);
  assert.equal(stored.length, 15);
  assert.deepEqual(stored, buildRoomSet((2 ** 31 - 1) >> 1, parseSettings({ targets: ["es", "ja"] })!));
  assert.ok(!("questions" in r.body));
});
