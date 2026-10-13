import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { Api, WorkQuestion } from "./api";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const AVAILABLE = [{ code: "de", name: "German" }, { code: "he", name: "Hebrew" }];

async function render(node: React.ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click());
  const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);
  return { host, click, button, unmount: () => act(async () => root.unmount()) };
}

describe("language chips on the desktop work quiz", () => {
  test("the saved languages are pressed, a tap saves the new list, and a failed save rolls back", async () => {
    const { LanguageChips, LANGUAGES_SAVE_FAILED } = await import("./views/WorkQuiz");
    let saved: string[] = ["he"];
    let fail = false;
    const api: Pick<Api, "workLanguages" | "workSetLanguages"> = {
      workLanguages: async () => ({ languages: saved, available: AVAILABLE }),
      workSetLanguages: async (languages) => {
        if (fail) throw new Error("down");
        saved = languages;
        return { languages };
      },
    };
    const v = await render(<LanguageChips api={api} />);
    expect(v.host.querySelectorAll(".lang-chip").length).toBe(27);
    expect(v.button("Hebrew")!.getAttribute("aria-pressed")).toBe("true");
    expect(v.button("German")!.getAttribute("aria-pressed")).toBe("false");
    await v.click(v.button("German"));
    expect(saved).toEqual(["he", "de"]);
    expect(v.button("German")!.getAttribute("aria-pressed")).toBe("true");
    fail = true;
    await v.click(v.button("Hebrew"));
    expect(saved).toEqual(["he", "de"]);
    expect(v.button("Hebrew")!.getAttribute("aria-pressed")).toBe("true");
    expect(v.host.textContent).toContain(LANGUAGES_SAVE_FAILED);
    expect(v.host.textContent).toContain("Wiktionary via Kaikki, CC-BY-SA");
    await v.unmount();
  });

  test("a word question renders the word in its script with rtl, the language, and the credit", async () => {
    const { WorkQuizView } = await import("./views/WorkQuiz");
    const q: WorkQuestion = {
      id: "p1",
      type: "pair",
      prompt: "Which German word matches this Hebrew word?",
      lines: ["שלום"],
      choices: ["Frieden", "Hand"],
      limitSec: 30,
      word: { lang: "he", choicesLang: "de", credit: "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0", href: "https://en.wiktionary.org" },
    };
    const api = {
      workNext: async () => q,
      workAnswer: async () => ({ correct: true, timedOut: false, answer: "Frieden", explain: "Both mean peace.", sources: [] }),
      workLanguages: async () => ({ languages: ["he", "de"], available: AVAILABLE }),
      workSetLanguages: async (languages: string[]) => ({ languages }),
    } as unknown as Api;
    const v = await render(<WorkQuizView api={api} />);
    const line = v.host.querySelector(".lines.word li")!;
    expect(line.textContent).toBe("שלום");
    expect(line.getAttribute("dir")).toBe("rtl");
    expect(line.getAttribute("lang")).toBe("he");
    const choice = v.host.querySelector(".choice .word")!;
    expect(choice.getAttribute("dir")).toBe("ltr");
    expect(choice.getAttribute("lang")).toBe("de");
    const credit = v.host.querySelector(".word-credit")!;
    expect(credit.textContent).toContain("Hebrew · ");
    expect(credit.querySelector("a")!.getAttribute("href")).toBe("https://en.wiktionary.org");
    expect(credit.textContent).toContain("CC-BY-SA");
    expect(v.host.querySelector(".lang-panel summary")!.textContent).toBe("Languages");
    await v.unmount();
  });

  test("a work question carries no word markup", async () => {
    const { QuestionBody } = await import("./views/WorkQuiz");
    const q: WorkQuestion = { id: "r1", type: "recall", prompt: "Which branch?", lines: ["dev"], choices: ["dev", "main"], limitSec: 30 };
    const v = await render(<QuestionBody q={q} />);
    expect(v.host.querySelector(".word-credit")).toBeNull();
    expect(v.host.querySelector(".lines")!.className).toBe("lines");
    expect(v.host.querySelector(".lines li")!.getAttribute("dir")).toBe("ltr");
    await v.unmount();
  });
});
