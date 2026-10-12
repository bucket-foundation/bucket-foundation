import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import { normalizeState, type Atom } from "@academy/engine";
import { ApiError, type Api, type DailyQuiz, type QuizQuestion, type QuizResult, type ReviewItem, type WorkStatus } from "./api";
import { attachBack, BACK_HINT, BACK_LABEL, BACK_NAME, BACK_WAIT_MS, BackTrail, isBackKey, isBackMouse } from "./back";
import { firstRunHash, href, parseHash } from "./router";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

function fakeHistory(first = "#/learn") {
  let entries: { state: unknown; url: string }[] = [{ state: null, url: first }];
  let at = 0;
  let backs = 0;
  return {
    get state() {
      return entries[at].state;
    },
    replaceState(state: unknown, _unused: string, url?: string | URL | null) {
      entries[at] = { state, url: url ? String(url) : entries[at].url };
    },
    pushState(state: unknown, _unused: string, url?: string | URL | null) {
      entries = [...entries.slice(0, at + 1), { state, url: String(url) }];
      at += 1;
    },
    back() {
      backs += 1;
      if (at > 0) at -= 1;
    },
    visit(url: string) {
      entries = [...entries.slice(0, at + 1), { state: null, url }];
      at += 1;
    },
    reload() {
      entries = entries.map((e) => ({ ...e }));
    },
    get url() {
      return entries[at].url;
    },
    get backs() {
      return backs;
    },
    get length() {
      return entries.length;
    },
  };
}

function timers() {
  const waiting: { run: () => void; ms: number }[] = [];
  return {
    later: (run: () => void, ms: number) => waiting.push({ run, ms }),
    waits: () => waiting.map((w) => w.ms),
    fire: () => waiting.splice(0).forEach((w) => w.run()),
  };
}

async function mount(el: ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(el));
  await act(async () => new Promise((r) => setTimeout(r, 0)));
  const click = async (target: Element | null | undefined) => {
    await act(async () => (target as HTMLElement).click());
    await act(async () => new Promise((r) => setTimeout(r, 0)));
  };
  const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes(label));
  return { host, act, click, button, unmount: () => act(async () => root.unmount()) };
}

describe("back trail", () => {
  test("has nowhere to go at the first screen and never asks the window to leave", () => {
    const h = fakeHistory();
    const trail = new BackTrail(h);
    expect(trail.canGoBack).toBe(false);
    expect(trail.back()).toBe(false);
    expect(h.backs).toBe(0);
  });

  test("two screens forward, then Back twice returns to the first screen and stops there", () => {
    const h = fakeHistory();
    const trail = new BackTrail(h);
    for (const url of ["#/learn/02-physics", "#/learn/02-physics/ph-heat"]) {
      h.visit(url);
      trail.moved();
    }
    expect(trail.canGoBack).toBe(true);
    expect(trail.back()).toBe(true);
    trail.moved();
    expect([h.url, trail.canGoBack]).toEqual(["#/learn/02-physics", true]);
    trail.back();
    trail.moved();
    expect([h.url, trail.canGoBack]).toEqual(["#/learn", false]);
    expect(trail.back()).toBe(false);
    expect(h.backs).toBe(2);
  });

  test("each step back lands on the address the router recorded, tab and item included", () => {
    const h = fakeHistory("#/research");
    const trail = new BackTrail(h);
    const steps = ["#/research/atlas/report", "#/research/atlas/figures", "#/research/atlas/figures/fig-2"];
    for (const url of steps) {
      h.visit(url);
      trail.moved();
    }
    const seen: string[] = [];
    while (trail.back()) {
      trail.moved();
      seen.push(h.url);
    }
    expect(seen).toEqual(["#/research/atlas/figures", "#/research/atlas/report", "#/research"]);
    expect(seen.map((s) => href(parseHash(s)))).toEqual(seen);
  });

  test("the browser's own back and forward keep the count right", () => {
    const h = fakeHistory();
    const trail = new BackTrail(h);
    h.visit("#/quiz");
    trail.moved();
    trail.moved();
    h.back();
    trail.moved();
    expect(trail.canGoBack).toBe(false);
    h.visit("#/review");
    trail.moved();
    expect(trail.canGoBack).toBe(true);
  });

  test("a screen that rewrites its own address keeps its place in the trail", () => {
    const h = fakeHistory();
    const trail = new BackTrail(h);
    h.visit("#/explore");
    trail.moved();
    h.replaceState(null, "", "?mode=globe#/explore");
    h.visit("#/notes");
    trail.moved();
    trail.back();
    trail.moved();
    expect([h.url, trail.canGoBack]).toEqual(["?mode=globe#/explore", true]);
    trail.back();
    trail.moved();
    expect(trail.canGoBack).toBe(false);
  });

  test("a screen pushed without an address change counts as a step", () => {
    const h = fakeHistory();
    const trail = new BackTrail(h);
    let told = 0;
    trail.watch(() => (told += 1));
    h.pushState(null, "", "#/data");
    expect([trail.canGoBack, told]).toEqual([true, 1]);
  });

  test("a reload keeps the count, and a fresh window starts at zero", () => {
    const h = fakeHistory();
    const first = new BackTrail(h);
    h.visit("#/path");
    first.moved();
    h.reload();
    expect(new BackTrail(h).canGoBack).toBe(true);
    expect(new BackTrail(fakeHistory("#/work/daily/2026-10-12")).canGoBack).toBe(false);
  });
});

describe("back keys", () => {
  const key = (over: Partial<KeyboardEvent>) => ({ key: "", code: "", altKey: false, metaKey: false, ctrlKey: false, shiftKey: false, target: document.body, ...over }) as KeyboardEvent;

  test("Alt with the left arrow, Command with the left bracket and the keyboard's own back key go back", () => {
    expect(isBackKey(key({ altKey: true, key: "ArrowLeft" }))).toBe(true);
    expect(isBackKey(key({ metaKey: true, key: "[", code: "BracketLeft" }))).toBe(true);
    expect(isBackKey(key({ key: "BrowserBack" }))).toBe(true);
  });

  test("a plain arrow, a tab-bar move and an arrow inside a text box stay where they are", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    expect(isBackKey(key({ key: "ArrowLeft" }))).toBe(false);
    expect(isBackKey(key({ altKey: true, shiftKey: true, key: "ArrowLeft" }))).toBe(false);
    expect(isBackKey(key({ altKey: true, ctrlKey: true, key: "ArrowLeft" }))).toBe(false);
    expect(isBackKey(key({ altKey: true, key: "ArrowLeft", target: input }))).toBe(false);
    expect(isBackKey(key({ altKey: true, key: "ArrowRight" }))).toBe(false);
  });

  test("the mouse back button is button 3", () => {
    expect([0, 1, 2, 3, 4].filter((button) => isBackMouse({ button }))).toEqual([3]);
  });

  test("the key and the mouse button go back once, and stand down when the window already moved", () => {
    const h = fakeHistory();
    const t = timers();
    const trail = new BackTrail(h, t.later);
    const detach = attachBack(trail, window);
    for (const url of ["#/quiz", "#/quiz/practice"]) {
      h.visit(url);
      window.dispatchEvent(new Event("hashchange"));
    }
    const press = new KeyboardEvent("keydown", { key: "ArrowLeft", altKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(press);
    expect([press.defaultPrevented, t.waits(), h.backs]).toEqual([true, [BACK_WAIT_MS], 0]);
    t.fire();
    window.dispatchEvent(new Event("popstate"));
    expect([h.backs, h.url]).toEqual([1, "#/quiz"]);

    const down = new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true });
    const up = new MouseEvent("mouseup", { button: 3, bubbles: true, cancelable: true });
    document.body.dispatchEvent(down);
    document.body.dispatchEvent(up);
    expect([down.defaultPrevented, up.defaultPrevented, t.waits().length]).toEqual([true, true, 1]);
    h.back();
    window.dispatchEvent(new Event("popstate"));
    t.fire();
    expect([h.backs, h.url, trail.canGoBack]).toEqual([2, "#/learn", false]);

    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", altKey: true, bubbles: true, cancelable: true }));
    t.fire();
    expect(h.backs).toBe(2);
    detach();
    h.visit("#/notes");
    window.dispatchEvent(new Event("hashchange"));
    expect(trail.canGoBack).toBe(false);
  });
});

describe("back button", () => {
  test("is one named button, off with nowhere to go, on after two screens, and a click goes back one screen", async () => {
    const { BackButton } = await import("./back");
    const h = fakeHistory();
    const trail = new BackTrail(h);
    const v = await mount(<BackButton trail={trail} />);
    const buttons = v.host.querySelectorAll("button");
    const back = buttons[0] as HTMLButtonElement;
    expect([buttons.length, back.textContent, back.getAttribute("aria-label"), back.getAttribute("title"), back.type, back.disabled]).toEqual([1, BACK_LABEL, BACK_NAME, BACK_HINT, "button", true]);
    await v.act(async () => {
      for (const url of ["#/learn/02-physics", "#/learn/02-physics/ph-heat"]) {
        h.visit(url);
        trail.moved();
      }
    });
    expect(back.disabled).toBe(false);
    await v.click(back);
    await v.act(async () => trail.moved());
    expect([h.backs, h.url, back.disabled]).toEqual([1, "#/learn/02-physics", false]);
    await v.click(back);
    await v.act(async () => trail.moved());
    expect([h.backs, h.url, back.disabled]).toEqual([2, "#/learn", true]);
    await v.unmount();
  });

  test("the words on the button hold no dash and no banned word", () => {
    for (const s of [BACK_LABEL, BACK_NAME, BACK_HINT]) {
      expect(s).not.toMatch(/[–—]/);
      expect(s).not.toMatch(/\b(simply|just|easily|quickly|really|very|navigate)\b/i);
    }
  });
});

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const STATUS: WorkStatus = { beads: 0, prs: 0, repo: null, repoError: null, chat: { claude: false, codex: false }, languages: [], ready: false, answered: 0, correct: 0 };
const daily = (day: string): DailyQuiz => ({ day, answered: [], questions: [{ id: "c1", type: "recall", prompt: "Which law does $E = mc^2$ state?", lines: [], choices: ["Mass is energy", "Force is mass"], limitSec: 30 }] });

function quizApi(over: Partial<Record<keyof Api, unknown>> = {}) {
  const asked: string[] = [];
  const api = {
    workStatus: async () => STATUS,
    workChat: async (chat: WorkStatus["chat"]) => ({ chat }),
    dailyQuiz: async (day: string) => (asked.push(day), daily(day)),
    ...over,
  } as unknown as Api;
  return { api, asked };
}

describe("quiz tab", () => {
  test("opens today's daily quiz first, with the practice quiz one click away", async () => {
    const { QuizView } = await import("./views/Quiz");
    const { api, asked } = quizApi();
    const v = await mount(<QuizView api={api} />);
    expect(asked).toEqual([TODAY]);
    expect(v.host.querySelector("h1")!.textContent).toBe("Daily quiz");
    expect(v.host.querySelector(".head .muted")!.textContent).toContain(TODAY);
    expect(v.host.querySelector(".q .katex")).not.toBeNull();
    const kinds = Array.from(v.host.querySelectorAll(".quiz-kinds a")).map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("aria-current")]);
    expect(kinds).toEqual([["Daily quiz", "#/quiz", "page"], ["Practice quiz", "#/quiz/practice", null]]);
    expect(v.host.querySelector(".quiz-kinds")!.getAttribute("aria-label")).toBe("Kinds of quiz");
    await v.unmount();
  });

  test("a day with no quiz still shows the way to the practice quiz and the work quiz", async () => {
    const { QuizView } = await import("./views/Quiz");
    const { api } = quizApi({ dailyQuiz: () => Promise.reject(new ApiError("no quiz for that day", 404)) });
    const v = await mount(<QuizView api={api} />);
    expect(v.host.querySelector("h2")!.textContent).toBe(`No quiz for ${TODAY}`);
    expect(v.host.querySelector('a[href="#/quiz/practice"]')!.textContent).toBe("Practice quiz");
    expect(v.host.querySelector('a[href="#/work"]')!.textContent).toBe("Open the work quiz");
    await v.unmount();
  });

  test("the notification's address opens that day, and an older day leaves the Daily quiz link unmarked", async () => {
    const { DailyScreen } = await import("./views/Quiz");
    const route = parseHash("#/work/daily/2026-09-30");
    expect(route).toEqual({ name: "daily", day: "2026-09-30" });
    const { api, asked } = quizApi();
    const v = await mount(<DailyScreen api={api} day="2026-09-30" />);
    expect(asked).toEqual(["2026-09-30"]);
    expect(v.host.querySelector("h1")!.textContent).toBe("Daily quiz");
    expect(Array.from(v.host.querySelectorAll(".quiz-kinds a")).map((a) => a.getAttribute("aria-current"))).toEqual([null, null]);
    await v.unmount();
  });

  test("old addresses keep their screens and the practice quiz has its own", () => {
    expect(parseHash("#/quiz")).toEqual({ name: "quiz" });
    expect(parseHash("#/work")).toEqual({ name: "work" });
    expect(parseHash("#/quiz/practice")).toEqual({ name: "practice" });
    expect(href({ name: "practice" })).toBe("#/quiz/practice");
    expect(parseHash("#/quiz/practice/extra")).toEqual({ name: "quiz" });
    expect(parseHash("#/quiz/other")).toEqual({ name: "quiz" });
  });

  test("a new person with no progress starts in the practice quiz", () => {
    expect(firstRunHash("", [{ introduced: 0, xp: 0 }])).toBe("#/quiz/practice");
    expect(firstRunHash("", [{ introduced: 1, xp: 0 }])).toBeNull();
  });
});

const QUESTION: QuizQuestion = { itemId: "02-physics/mass-energy/abc", prompt: "Which law does $E = mc^2$ state?", choices: ["$E = mc^2$ ties mass to energy", "$F = ma$ ties force to mass"], limitSec: 30 };
const MISS: QuizResult = { correct: false, timedOut: false, rating: 1, answer: QUESTION.choices[0], explain: "Rest energy is $E_0 = mc^2$, with $c$ the speed of light.", lesson: { deck: "02-physics", atom: "mass-energy", title: "Mass and energy, $E = mc^2$" } };

describe("math in the practice quiz", () => {
  const open = async (result: QuizResult) => {
    const { PracticeQuizView } = await import("./views/Quiz");
    const sent: [string, number | null][] = [];
    const api = { quiz: async () => [QUESTION], answer: async (id: string, choice: number | null) => (sent.push([id, choice]), result) } as unknown as Api;
    return { v: await mount(<PracticeQuizView api={api} />), sent };
  };

  test("a formula in the question renders", async () => {
    const { v } = await open(MISS);
    expect(v.host.querySelector("h1")!.textContent).toBe("Practice quiz");
    expect(v.host.querySelectorAll(".q .katex").length).toBe(1);
    expect(v.host.querySelector(".q")!.textContent).not.toContain("$");
    expect(v.host.querySelector(".q annotation")!.textContent).toBe("E = mc^2");
    await v.unmount();
  });

  test("a formula in each option renders", async () => {
    const { v } = await open(MISS);
    const choices = Array.from(v.host.querySelectorAll(".choice"));
    expect(choices.map((c) => c.querySelectorAll(".katex").length)).toEqual([1, 1]);
    expect(choices.map((c) => c.querySelector("annotation")!.textContent)).toEqual(["E = mc^2", "F = ma"]);
    expect(choices.some((c) => c.textContent!.includes("$"))).toBe(false);
    await v.unmount();
  });

  test("a formula in the explanation, the answer line and the lesson link renders after a miss", async () => {
    const { v, sent } = await open(MISS);
    await v.click(v.host.querySelectorAll(".choice")[1]);
    expect(sent).toEqual([[QUESTION.itemId, 1]]);
    expect(v.host.querySelector(".feedback b")!.textContent).toBe("Not quite");
    expect(v.host.querySelectorAll(".feedback .katex").length).toBe(1);
    const why = v.host.querySelector(".why")!;
    expect(Array.from(why.querySelectorAll("annotation")).map((a) => a.textContent)).toEqual(["E_0 = mc^2", "c", "E = mc^2"]);
    const link = why.querySelector("a.learn-this")!;
    expect([link.getAttribute("href"), link.querySelectorAll(".katex").length]).toEqual(["#/learn/02-physics/mass-energy", 1]);
    expect(link.textContent).toContain("Open the lesson on Mass and energy");
    expect(v.host.querySelector(".after-block")!.textContent).not.toContain("$");
    await v.unmount();
  });

  test("a right answer shows the answer and the explanation with no lesson link, and an older Bucket shows the answer alone", async () => {
    const right = await open({ ...MISS, correct: true, rating: 3 });
    await right.v.click(right.v.host.querySelectorAll(".choice")[0]);
    expect(right.v.host.querySelector(".feedback b")!.textContent).toBe("Correct");
    expect(right.v.host.querySelectorAll(".why .katex").length).toBe(2);
    expect(right.v.host.querySelector("a.learn-this")).toBeNull();
    await right.v.click(right.v.button("Next"));
    expect(right.v.host.querySelector("h2")!.textContent).toBe("1 of 1 correct");
    await right.v.unmount();

    const old = await open({ correct: false, timedOut: true, rating: 1, answer: QUESTION.choices[0] });
    await old.v.click(old.v.host.querySelectorAll(".choice")[1]);
    expect(old.v.host.querySelector(".feedback b")!.textContent).toBe("Out of time");
    expect(old.v.host.querySelector(".why")).toBeNull();
    await old.v.unmount();
  });

  test("text with a price and text with broken math stay readable", async () => {
    const { PracticeQuizView } = await import("./views/Quiz");
    const odd: QuizQuestion = { itemId: "x", prompt: "A book costs $5 and a pen costs $2. Which costs more?", choices: ["The book", "$\\frac{1}{$"], limitSec: 30 };
    const v = await mount(<PracticeQuizView api={{ quiz: async () => [odd], answer: async () => MISS } as unknown as Api} />);
    expect(v.host.querySelector(".q")!.textContent).toBe(odd.prompt);
    expect(v.host.querySelectorAll(".choice").length).toBe(2);
    expect(v.host.querySelector(".error")).toBeNull();
    await v.unmount();
  });
});

describe("math in review and in a deck", () => {
  test("a review card renders the formula in its title, question and answer", async () => {
    const { ReviewView } = await import("./views/Review");
    const card: ReviewItem = { id: "02-physics/mass-energy/abc", title: "Rest energy $E_0$", prompt: "What does $E = mc^2$ state?", answer: "Mass $m$ holds energy $mc^2$." };
    const v = await mount(<ReviewView api={{ due: async () => [card], rate: async () => ({ ok: true, due: null }) } as unknown as Api} />);
    expect([v.host.querySelectorAll(".tag .katex").length, v.host.querySelectorAll(".q .katex").length]).toEqual([1, 1]);
    await v.click(v.button("Show answer"));
    expect(v.host.querySelectorAll(".a .katex").length).toBe(2);
    expect(v.host.querySelector(".card")!.textContent).not.toContain("$");
    await v.unmount();
  });

  test("a deck card renders its equation as display math and the formulas in its question and answer", async () => {
    const { DeckView } = await import("./views/Deck");
    const atoms: Atom[] = [{ id: "mass-energy", title: "Mass and energy", shell: "nucleus", requires: [], summary: "Mass is energy: $E = mc^2$.", equation: "E_0 = mc^2", quiz: [{ level: "recall", prompt: "What does $E_0$ stand for?", answer: "Rest energy, $mc^2$." }] } as Atom];
    const api = { atoms: async () => atoms, progress: { load: async () => normalizeState(null), save: () => undefined } } as unknown as Api;
    const v = await mount(<DeckView api={api} deck="02-physics" />);
    expect(v.host.querySelector(".equation .math-display annotation")!.textContent).toBe("E_0 = mc^2");
    expect(v.host.querySelector(".equation .katex-display")).not.toBeNull();
    expect(v.host.querySelectorAll(".prompt .q .katex").length).toBe(1);
    await v.click(v.button("Show answer"));
    expect(v.host.querySelectorAll(".prompt .a .katex").length).toBe(1);
    expect(v.host.querySelector(".card")!.textContent).not.toContain("$");
    await v.unmount();
  });
});
