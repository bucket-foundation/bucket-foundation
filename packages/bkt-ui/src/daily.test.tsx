import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { ApiError, type DailyAnswer, type DailyQuiz } from "./api";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

const DAY = "2026-09-30";
const QUIZ: DailyQuiz = {
  day: DAY,
  answered: [],
  questions: [
    { id: "c1", type: "recall", prompt: "Which branch takes desktop PRs?", lines: [], choices: ["dev", "main"], limitSec: 30 },
    { id: "f1", type: "estimate", prompt: "How many lines did the transcript hold?", lines: [], choices: null, limitSec: 90 },
  ],
};
const graded = (over: Partial<DailyAnswer>): DailyAnswer => ({ correct: true, timedOut: false, answer: "dev", explain: "Desktop work targets dev.", log10Distance: null, ...over });

type Call = { day: string; id: string; response: string; elapsedMs: number };

async function mount(api: { dailyQuiz: (day: string) => Promise<DailyQuiz>; dailyAnswer: (day: string, id: string, response: string, elapsedMs: number) => Promise<DailyAnswer> }) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { DailyQuizView } = await import("./views/WorkQuiz");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<DailyQuizView api={api} day={DAY} />));
  const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click());
  const type = async (text: string) => {
    const input = host.querySelector("input") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  };
  const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes(label));
  return { host, click, type, button, unmount: () => act(async () => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("daily quiz view", () => {
  test("a day with no quiz says so in plain words and asks for nothing", async () => {
    const calls: Call[] = [];
    const v = await mount({
      dailyQuiz: () => Promise.reject(new ApiError("no quiz for that day", 404)),
      dailyAnswer: async (day, id, response, elapsedMs) => (calls.push({ day, id, response, elapsedMs }), graded({})),
    });
    const text = v.host.textContent ?? "";
    expect(text).toContain(`No quiz for ${DAY}`);
    expect(text).toContain("Bucket has no quiz saved for this day");
    expect(text).toContain("nothing was built for this one");
    expect(text).toContain("held nothing Bucket could ask about");
    expect(text).not.toContain("Import");
    expect(v.host.querySelector(".error")).toBeNull();
    expect(v.host.querySelector("article")).toBeNull();
    expect(v.host.querySelector('a[href="#/work"]')).not.toBeNull();
    expect(calls).toEqual([]);
    await v.unmount();
  });

  test("a 404 without the server's message reads as an older Bucket, with its own line", async () => {
    const { OUTDATED } = await import("./views/WorkQuiz");
    const v = await mount({ dailyQuiz: () => Promise.reject(new ApiError("/local/work-quiz/daily?day=2026-09-30 404", 404)), dailyAnswer: async () => graded({}) });
    expect(v.host.textContent).toContain(OUTDATED);
    expect(v.host.textContent).not.toContain("No quiz for");
    expect(v.host.textContent).not.toContain("has not shipped yet");
    expect(v.host.querySelector(".error")).toBeNull();
    await v.unmount();
  });

  test("a double click sends one request and shows the grade alone", async () => {
    const { act } = await import("react");
    const { GRADED_ONCE } = await import("./views/WorkQuiz");
    let n = 0;
    let release: (a: DailyAnswer) => void = () => {};
    const v = await mount({
      dailyQuiz: async () => QUIZ,
      dailyAnswer: () => {
        n++;
        if (n > 1) return Promise.reject(new ApiError("already answered", 409));
        return new Promise<DailyAnswer>((ok) => (release = ok));
      },
    });
    const dev = v.button("dev") as HTMLButtonElement;
    await act(async () => {
      dev.click();
      dev.click();
      (v.button("main") as HTMLButtonElement).click();
    });
    expect(n).toBe(1);
    await act(async () => release(graded({})));
    expect(v.host.textContent).toContain("Correct");
    expect(v.host.textContent).not.toContain(GRADED_ONCE);
    expect(v.host.textContent).toContain("1 of 2 answered");
    await v.unmount();
  });

  test("a failed request frees the guard so the question can be answered again", async () => {
    let n = 0;
    const v = await mount({ dailyQuiz: async () => QUIZ, dailyAnswer: async () => (n++ === 0 ? Promise.reject(new ApiError("elapsedMs required", 400)) : graded({})) });
    await v.click(v.button("dev"));
    await v.click(v.button("dev"));
    expect(n).toBe(2);
    expect(v.host.textContent).toContain("Correct");
    await v.unmount();
  });

  test("a 404 on the answer closes the question and asks for a reload", async () => {
    const { QUIZ_CHANGED } = await import("./views/WorkQuiz");
    let n = 0;
    const v = await mount({ dailyQuiz: async () => QUIZ, dailyAnswer: () => (n++, Promise.reject(new ApiError("no such question", 404))) });
    await v.click(v.button("dev"));
    expect(v.host.textContent).toContain(QUIZ_CHANGED);
    expect(v.button("Reload")).toBeDefined();
    expect(v.button("Next")).toBeUndefined();
    expect((v.button("dev") as HTMLButtonElement).disabled).toBe(true);
    expect(v.host.textContent).toContain("0 of 2 answered");
    await v.click(v.button("dev"));
    expect(n).toBe(1);
    await v.unmount();
  });

  test("a server failure shows the error and never the empty state", async () => {
    const v = await mount({ dailyQuiz: () => Promise.reject(new ApiError("data key does not match", 500)), dailyAnswer: async () => graded({}) });
    expect(v.host.querySelector(".error")!.textContent).toBe("Bucket ran into a problem. Try again.");
    expect(v.host.textContent).not.toContain("No quiz for");
    await v.unmount();
  });

  test("answering a choice and a Fermi question posts the day and shows the grade and the distance", async () => {
    const calls: Call[] = [];
    const v = await mount({
      dailyQuiz: async () => QUIZ,
      dailyAnswer: async (day, id, response, elapsedMs) => {
        calls.push({ day, id, response, elapsedMs });
        return id === "c1" ? graded({}) : graded({ correct: false, answer: "1000", explain: "About a thousand lines.", log10Distance: Math.log10(50) });
      },
    });
    expect(v.host.textContent).toContain("0 of 2 answered");
    expect(v.host.textContent).toContain("Which branch takes desktop PRs?");
    await v.click(v.button("dev"));
    expect(v.host.textContent).toContain("Correct");
    expect(v.host.textContent).toContain("Desktop work targets dev.");
    expect(v.host.textContent).toContain("1 of 2 answered");
    expect(v.host.querySelector(".choice.right")!.textContent).toContain("dev");
    expect((v.button("main") as HTMLButtonElement).disabled).toBe(true);
    await v.click(v.button("main"));
    expect(calls).toHaveLength(1);
    await v.click(v.button("Next"));
    expect(v.host.textContent).toContain("How many lines did the transcript hold?");
    await v.type("50000");
    expect(v.host.textContent).toContain("Not quite");
    expect(v.host.textContent).toContain("answer 1000");
    expect(v.host.textContent).toContain("off by a factor of 50.0");
    await v.click(v.button("Next"));
    expect(v.host.textContent).toContain(`Done for ${DAY}`);
    expect(v.host.textContent).toContain("1 right in this sitting");
    expect(calls.map((c) => [c.day, c.id, c.response])).toEqual([
      [DAY, "c1", "dev"],
      [DAY, "f1", "50000"],
    ]);
    expect(calls.every((c) => Number.isFinite(c.elapsedMs) && c.elapsedMs >= 0)).toBe(true);
    await v.unmount();
  });

  test("a question the server already graded is refused once, in words, and the quiz moves on", async () => {
    let n = 0;
    const v = await mount({
      dailyQuiz: async () => QUIZ,
      dailyAnswer: async () => {
        n++;
        throw new ApiError("already answered", 409);
      },
    });
    const { GRADED_ONCE } = await import("./views/WorkQuiz");
    await v.click(v.button("dev"));
    expect(v.host.textContent).toContain(GRADED_ONCE);
    expect(v.host.textContent).not.toContain("Correct");
    expect(v.host.querySelector(".error")).toBeNull();
    expect(v.host.textContent).toContain("1 of 2 answered");
    await v.click(v.button("main"));
    expect(n).toBe(1);
    await v.click(v.button("Next"));
    expect(v.host.textContent).toContain("How many lines did the transcript hold?");
    expect(v.host.textContent).not.toContain(GRADED_ONCE);
    await v.unmount();
  });

  test("questions answered earlier are skipped, and a fully answered day shows the done state", async () => {
    const some = await mount({ dailyQuiz: async () => ({ ...QUIZ, answered: ["c1"] }), dailyAnswer: async () => graded({}) });
    expect(some.host.textContent).toContain("1 of 2 answered");
    expect(some.host.textContent).toContain("How many lines did the transcript hold?");
    expect(some.host.textContent).not.toContain("Which branch takes desktop PRs?");
    await some.unmount();
    const all = await mount({ dailyQuiz: async () => ({ ...QUIZ, answered: ["c1", "f1"] }), dailyAnswer: async () => graded({}) });
    expect(all.host.textContent).toContain(`Done for ${DAY}`);
    expect(all.host.querySelector("article")).toBeNull();
    await all.unmount();
  });

  test("a failed answer that is no refusal keeps the question open", async () => {
    const v = await mount({ dailyQuiz: async () => QUIZ, dailyAnswer: () => Promise.reject(new ApiError("elapsedMs required", 400)) });
    await v.click(v.button("dev"));
    expect(v.host.querySelector(".error")!.textContent).toBe("Bucket could not use that. Check it and try again.");
    expect(v.host.textContent).toContain("0 of 2 answered");
    expect((v.button("dev") as HTMLButtonElement).disabled).toBe(false);
    await v.unmount();
  });
});

describe("factor wording", () => {
  test("a question at the length limits shows every word, then the why line and one source link", async () => {
    const words = (n: number, w: string) => Array.from({ length: n }, (_, i) => `${w}${i}`).join(" ");
    const choices = [words(5, "a"), words(5, "b"), words(5, "c"), words(5, "d")];
    const full: DailyQuiz = { day: DAY, answered: [], questions: [{ id: "w1", type: "recall", prompt: words(10, "p"), lines: [words(5, "l")], choices, limitSec: 30 }] };
    const sources = [
      { kind: "pr", ref: "#504", label: "PR #504", href: "https://github.com/example/repo/pull/504" },
      { kind: "pr", ref: "#505", label: "PR #505", href: "https://github.com/example/repo/pull/505" },
    ];
    const v = await mount({ dailyQuiz: async () => full, dailyAnswer: async () => graded({ answer: choices[0], explain: words(20, "e"), sources }) });
    const card = v.host.querySelector("article")!;
    for (const text of [words(10, "p"), words(5, "l"), ...choices]) expect(card.textContent).toContain(text);
    expect(card.textContent).not.toContain("…");
    expect(card.querySelector(".why")).toBeNull();
    await v.click(v.host.querySelector(".choice"));
    expect(card.querySelector(".why")!.textContent).toBe(`${words(20, "e")} PR #504`);
    const links = card.querySelectorAll(".why a");
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("https://github.com/example/repo/pull/504");
    await v.unmount();
  });

  test("a miss shows one learn this link and a right answer shows none", async () => {
    const resource = { label: "learn this", href: "/research-os/learn/02-physics/entropy" };
    const v = await mount({ dailyQuiz: async () => QUIZ, dailyAnswer: async (_d, id) => (id === "c1" ? graded({ correct: false, resource }) : graded({ resource })) });
    await v.click(v.host.querySelector(".choice"));
    const links = v.host.querySelectorAll(".why a.learn-this");
    expect(links.length).toBe(1);
    expect(links[0].textContent).toBe("learn this");
    expect(links[0].getAttribute("href")).toBe("#/learn/02-physics/entropy");
    await v.unmount();
  });

  test("resourceHref keeps absolute links, maps lessons to window routes and sends the rest to the site", async () => {
    const { resourceHref, SITE_ORIGIN } = await import("./views/WorkQuiz");
    expect(resourceHref("https://doi.org/10.1/x")).toBe("https://doi.org/10.1/x");
    expect(resourceHref("/research-os/learn/02-physics/entropy")).toBe("#/learn/02-physics/entropy");
    expect(resourceHref("/excerpts/a/b#evidence")).toBe(`${SITE_ORIGIN}/excerpts/a/b#evidence`);
  });

  test("a source without an https link shows as plain text", async () => {
    const v = await mount({ dailyQuiz: async () => QUIZ, dailyAnswer: async () => graded({ sources: [{ kind: "chat", ref: "aa", label: "Claude session, 2026-09-30", href: null }] }) });
    await v.click(v.host.querySelector(".choice"));
    expect(v.host.querySelector(".why a")).toBeNull();
    expect(v.host.querySelector(".why .source")!.textContent).toBe("Claude session, 2026-09-30");
    await v.unmount();
  });

  test("the quiz card styles wrap text and never clip it", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("./app.css", import.meta.url), "utf8");
    const rules = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter((m) => /(^|[\s,])\.(q|choice|lines|why)\b/.test(m[1]));
    expect(rules.length).toBeGreaterThan(3);
    for (const m of rules) expect(m[2]).not.toMatch(/text-overflow|line-clamp|nowrap/);
    expect(css).toMatch(/\.why\s*\{[^}]*overflow-wrap: anywhere/);
  });

  test("names the factor in plain numbers", async () => {
    const { factorOff } = await import("./views/WorkQuiz");
    expect(factorOff(0)).toBe("on the mark");
    expect(factorOff(Math.log10(2))).toBe("off by a factor of 2.0");
    expect(factorOff(3)).toBe("off by a factor of 1,000");
  });
});
