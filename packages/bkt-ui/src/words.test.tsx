import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { Api, LessonWord } from "./api";
import { CONCEPT_PAGE, LESSON_PAGE, NO_CONCEPTS, NO_WORD_DECKS, SCRIPT_WORDS, WORD_CREDIT, WORD_DECKS, WORD_LESSON_LIST, WORD_LICENCE, WORD_QUESTION } from "./fixtures/word-lessons";
import { href, parseHash } from "./router";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

async function render(node: React.ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  await act(async () => new Promise((r) => setTimeout(r, 0)));
  const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click());
  const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);
  return { host, click, button, unmount: () => act(async () => root.unmount()) };
}

const CREDIT = "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0";

describe("word scripts", () => {
  for (const w of SCRIPT_WORDS) {
    test(`${w.name} renders ${w.dir} in its own script`, async () => {
      const { WordCard } = await import("./views/Words");
      const card: LessonWord = { ...w, theme: "Land and water", others: SCRIPT_WORDS.filter((o) => o.lang !== w.lang).slice(0, 2) };
      const v = await render(<WordCard w={card} />);
      const form = v.host.querySelector(".word-head .word-form")!;
      expect(form.textContent).toBe(w.word);
      expect(form.getAttribute("dir")).toBe(w.dir);
      expect(form.getAttribute("lang")).toBe(w.lang);
      expect(form.getAttribute("data-script")).toBe(w.script);
      const ipa = v.host.querySelector(".word-head .ipa")!;
      expect(ipa.textContent).toBe(`/${w.ipa}/`);
      expect(ipa.getAttribute("dir")).toBe("ltr");
      expect(v.host.querySelector(".word-meaning")!.getAttribute("dir")).toBe("ltr");
      const others = Array.from(v.host.querySelectorAll(".word-other .word-form"));
      expect(others.map((o) => [o.getAttribute("lang"), o.getAttribute("dir"), o.textContent])).toEqual(card.others.map((o) => [o.lang, o.dir, o.word]));
      await v.unmount();
    });
  }

  test("the fixture holds one word for each script direction the lessons must show", () => {
    expect(SCRIPT_WORDS.filter((w) => w.dir === "rtl").map((w) => w.lang)).toEqual(["ar", "he", "fa"]);
    expect(SCRIPT_WORDS.filter((w) => w.dir === "ltr").map((w) => w.script)).toEqual(["han", "kana", "hangul", "devanagari", "tamil", "thai"]);
  });

  test("a formula in a definition renders as math", async () => {
    const { WordCard } = await import("./views/Words");
    const v = await render(<WordCard w={{ ...LESSON_PAGE.words[0], meaning: "the unit $10^{-2}$ of a metre" }} />);
    expect(v.host.querySelector(".word-meaning .katex")).not.toBeNull();
    await v.unmount();
  });
});

describe("word lesson pages", () => {
  test("a lesson shows each word with its sound, kind, meaning, folded senses and etymology, and the other languages side by side", async () => {
    const { WordLessonView } = await import("./views/Words");
    const api = { wordLesson: async () => LESSON_PAGE, wordQuiz: async () => ({ questions: [], credit: WORD_CREDIT }), wordAnswer: async () => ({ correct: true, timedOut: false, answer: "", explain: "" }) } as unknown as Api;
    const v = await render(<WordLessonView api={api} deck="de" n={1} />);
    expect(v.host.querySelector("h1")!.textContent).toBe("German words: Body");
    const cards = v.host.querySelectorAll(".word-card");
    expect(cards.length).toBe(2);
    const first = cards[0];
    expect(first.querySelector(".word-form.big")!.textContent).toBe("Hand");
    expect(first.querySelector(".ipa")!.textContent).toBe("/hant/");
    expect(first.querySelector(".tag")!.textContent).toBe("noun");
    expect(first.querySelector(".word-meaning")!.textContent).toBe("hand");
    const folds = Array.from(first.querySelectorAll("details"));
    expect(folds.map((d) => d.querySelector("summary")!.textContent)).toEqual(["Other senses", "Etymology"]);
    expect(folds.every((d) => !d.hasAttribute("open"))).toBe(true);
    expect(folds[1].textContent).toContain("Proto-Germanic");
    expect(Array.from(first.querySelectorAll(".word-other")).map((o) => o.textContent)).toEqual(["Arabicيد/jad/", "Hindiहाथ/ɦɑːt̪ʰ/"]);
    expect(first.querySelector(".word-other .word-form")!.getAttribute("dir")).toBe("rtl");
    expect(cards[1].querySelector(".word-others")).toBeNull();
    const { LESSON_ONLY, LESSON_ONLY_NOTE } = await import("./views/Words");
    expect(Array.from(cards[0].querySelectorAll(".tag")).map((t) => t.textContent)).toEqual(["noun"]);
    expect(Array.from(cards[1].querySelectorAll(".tag")).map((t) => t.textContent)).toEqual(["noun", LESSON_ONLY]);
    expect(v.host.textContent).toContain(LESSON_ONLY_NOTE);
    expect(v.host.querySelector('.word-credit a[href="#/words/licence"]')!.textContent).toBe("Licence and changes");
    expect(v.host.querySelector(".word-credit")!.textContent).toContain(CREDIT);
    expect(v.host.textContent).not.toMatch(/course|fluent/i);
    await v.unmount();
  });

  test("the quiz after a lesson grades each answer and says the words joined the review schedule", async () => {
    const { WordLessonView, IN_REVIEW } = await import("./views/Words");
    const sent: unknown[] = [];
    const api = {
      wordLesson: async () => LESSON_PAGE,
      wordQuiz: async (pick: unknown) => (sent.push(pick), { questions: [WORD_QUESTION], credit: WORD_CREDIT }),
      wordAnswer: async (id: string, response: string) => (sent.push([id, response]), { correct: true, timedOut: false, answer: "Hand", explain: 'Hand is German for "hand".', sources: [{ kind: "word", ref: "de:hand", label: CREDIT, href: "https://en.wiktionary.org/wiki/Hand" }] }),
    } as unknown as Api;
    const v = await render(<WordLessonView api={api} deck="de" n={1} />);
    await v.click(v.button("Quiz me on these words"));
    await v.click(v.host.querySelector(".choice"));
    expect(sent).toEqual([{ deck: "de", lesson: 1 }, ["meaning-1", "Hand"]]);
    expect(v.host.querySelector(".choice .word")!.getAttribute("lang")).toBe("de");
    expect(v.host.querySelector(".why")!.textContent).toContain(CREDIT);
    await v.click(v.button("Next"));
    expect(v.host.textContent).toContain("1 of 1 correct");
    expect(v.host.textContent).toContain(IN_REVIEW);
    expect(v.button("Next word lesson")).toBeDefined();
    expect(v.host.querySelector(".word-credit")!.textContent).toContain(CREDIT);
    await v.unmount();
  });

  test("the deck page lists the lessons with their words and the credit", async () => {
    const { WordDeckView, WORD_LESSONS_NOTE } = await import("./views/Words");
    const v = await render(<WordDeckView api={{ wordLessons: async () => WORD_LESSON_LIST }} deck="de" />);
    expect(v.host.querySelector("h1")!.textContent).toBe("German word lessons");
    expect(Array.from(v.host.querySelectorAll("a.deck")).map((a) => a.getAttribute("href"))).toEqual(["#/words/de/1", "#/words/de/2"]);
    expect(v.host.querySelector(".word-list")!.textContent).toBe("Hand · Auge");
    expect(v.host.textContent).toContain(WORD_LESSONS_NOTE);
    expect(v.host.querySelector(".word-credit")!.textContent).toContain(CREDIT);
    await v.unmount();
  });

  test("the by-concept page sets the chosen languages side by side and marks a missing word", async () => {
    const { WordConceptsView, PICK_LANGUAGES } = await import("./views/Words");
    const quiz = { wordQuiz: async () => ({ questions: [], credit: WORD_CREDIT }), wordAnswer: async () => ({ correct: true, timedOut: false, answer: "", explain: "" }) };
    const v = await render(<WordConceptsView api={{ ...quiz, wordConcepts: async () => CONCEPT_PAGE } as unknown as Api} page={1} />);
    expect(Array.from(v.host.querySelectorAll("thead th")).map((t) => t.textContent)).toEqual(["Concept", "German", "Arabic", "Hindi"]);
    const rows = v.host.querySelectorAll("tbody tr");
    expect(Array.from(rows[0].querySelectorAll("td .word-form")).map((w) => [w.textContent, w.getAttribute("dir")])).toEqual([["Hand", "ltr"], ["يد", "rtl"], ["كف", "rtl"], ["हाथ", "ltr"]]);
    expect(rows[0].querySelectorAll("td")[1].querySelectorAll(".concept-word").length).toBe(2);
    expect(Array.from(rows[1].querySelectorAll("td")).map((t) => t.textContent)).toEqual(["Auge/ˈaʊ̯ɡə/", "no checked word", "no checked word"]);
    expect(rows[0].querySelector("td details summary")!.textContent).toBe("Etymology");
    expect(v.host.querySelector('a[href="#/words/concepts/2"]')!.textContent).toBe("Next page");
    expect(v.host.querySelector(".word-credit")!.textContent).toContain(CREDIT);
    await v.unmount();
    const none = await render(<WordConceptsView api={{ ...quiz, wordConcepts: async () => NO_CONCEPTS } as unknown as Api} page={1} />);
    expect(none.host.textContent).toContain(PICK_LANGUAGES);
    expect(none.host.querySelector("table")).toBeNull();
    expect(none.host.querySelector(".word-credit")!.textContent).toContain(CREDIT);
    await none.unmount();
  });

  test("Learn lists one deck per chosen language under Languages, with the by-concept link and the credit", async () => {
    const { LearnHome } = await import("./views/LearnHome");
    const base = { decks: async () => [], atoms: async () => [], progress: { pull: async () => ({}) }, agents: async () => ({ v: 1, supported: false, installed: false, sessions: [] }), reportFocus: async () => ({ ok: true }) };
    const v = await render(<LearnHome api={{ ...base, wordDecks: async () => WORD_DECKS } as unknown as Api} />);
    expect(Array.from(v.host.querySelectorAll("h2")).map((h) => h.textContent)).toContain("Languages");
    expect(Array.from(v.host.querySelectorAll('a.deck[href^="#/words/"]')).map((a) => [a.getAttribute("href"), a.querySelector(".deck-title")!.textContent])).toEqual([["#/words/de", "German words"], ["#/words/ar", "Arabic words"]]);
    expect(v.host.querySelector('a[href="#/words/concepts"]')!.textContent).toBe("By concept");
    expect(v.host.textContent).toContain("2 of 37 quiz words started · 41 words in 6 word lessons");
    expect(v.host.querySelector(".word-credit")!.textContent).toContain(CREDIT);
    await v.unmount();
    const { PICK_LANGUAGES } = await import("./views/Words");
    const none = await render(<LearnHome api={{ ...base, wordDecks: async () => NO_WORD_DECKS } as unknown as Api} />);
    expect(none.host.textContent).toContain(PICK_LANGUAGES);
    expect(none.host.querySelector('a[href="#/settings"]')).not.toBeNull();
    await none.unmount();
  });
});

describe("word list licence", () => {
  test("the licence page gives the credit, the changes and the full text behind a fold", async () => {
    const { WordLicenceView } = await import("./views/Words");
    const v = await render(<WordLicenceView api={{ wordLicence: async () => WORD_LICENCE }} />);
    expect(v.host.querySelector("h1")!.textContent).toBe("Word list licence");
    expect(v.host.textContent).toContain(CREDIT);
    expect(v.host.textContent).toContain("Changes made by Bucket");
    expect(v.host.querySelector('a[href="https://creativecommons.org/licenses/by-sa/3.0/"]')!.textContent).toBe("Creative Commons CC-BY-SA 3.0");
    const fold = v.host.querySelector("details.fine")!;
    expect(fold.hasAttribute("open")).toBe(false);
    expect(fold.querySelector("pre")!.textContent).toContain("Attribution-ShareAlike 3.0 Unported");
    expect(href({ name: "licence" })).toBe("#/words/licence");
    expect(parseHash("#/words/licence")).toEqual({ name: "licence" });
    await v.unmount();
  });
});

describe("word lesson addresses", () => {
  test("a deck, a lesson and a by-concept page each have an address that reads back", () => {
    expect(href({ name: "words", deck: "de" })).toBe("#/words/de");
    expect(href({ name: "words", deck: "de", lesson: 3 })).toBe("#/words/de/3");
    expect(href({ name: "concepts" })).toBe("#/words/concepts");
    expect(href({ name: "concepts", page: 2 })).toBe("#/words/concepts/2");
    expect(parseHash("#/words/de")).toEqual({ name: "words", deck: "de" });
    expect(parseHash("#/words/de/3")).toEqual({ name: "words", deck: "de", lesson: 3 });
    expect(parseHash("#/words/concepts/2")).toEqual({ name: "concepts", page: 2 });
    expect(parseHash("#/words/concepts")).toEqual({ name: "concepts" });
    expect(parseHash("#/words/DE/0")).toEqual({ name: "learn" });
  });
});
