import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { ApiError, type Api } from "./api";
import { DECKS_BODY, NO_DECKS_BODY, NO_WORD_HITS_BODY, WORD_HITS } from "./fixtures/decks";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const FORMAT_WORDS = /json|sqlite|sha256|\bzstd\b|\bfts\b|\bid\b|polingual-|bundled|manifest|undefined|null|NaN|\b[0-9a-f]{12}\b|\/home\//i;

async function render(node: React.ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  await act(async () => new Promise((r) => setTimeout(r, 0)));
  const settle = () => act(async () => new Promise((r) => setTimeout(r, 0)));
  return { host, act, settle, unmount: () => act(async () => root.unmount()) };
}

async function search(api: Pick<Api, "wordSearch">, text: string) {
  const { WordSearchBox } = await import("./views/Decks");
  const v = await render(<WordSearchBox api={api} />);
  const input = v.host.querySelector('input[type="search"]') as HTMLInputElement;
  await v.act(async () => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    set.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await v.act(async () => (v.host.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await v.settle();
  return v;
}

describe("word search box", () => {
  test("is labelled, and stays idle until something is typed", async () => {
    const { WordSearchBox, WORD_SEARCH_LABEL } = await import("./views/Decks");
    const asked: string[] = [];
    const v = await render(<WordSearchBox api={{ wordSearch: async (q) => (asked.push(q), WORD_HITS) }} />);
    const input = v.host.querySelector('input[type="search"]')!;
    expect(input.getAttribute("aria-label")).toBe(WORD_SEARCH_LABEL);
    expect(v.host.querySelector("form")!.getAttribute("role")).toBe("search");
    expect((v.host.querySelector("button") as HTMLButtonElement).disabled).toBe(true);
    expect(v.host.querySelector(".word-hits")).toBeNull();
    expect(asked).toEqual([]);
    await v.unmount();
  });

  test("shows each word in its own script and direction, with its meaning, a full entry link and the attribution", async () => {
    const asked: string[] = [];
    const v = await search({ wordSearch: async (q) => (asked.push(q), WORD_HITS) }, "  water ");
    expect(asked).toEqual(["water"]);
    const rows = Array.from(v.host.querySelectorAll(".word-hit"));
    expect(rows.length).toBe(4);
    const forms = rows.map((r) => r.querySelector(".word-form")!);
    expect(forms.map((f) => [f.textContent, f.getAttribute("dir"), f.getAttribute("lang"), f.getAttribute("data-script")])).toEqual([
      ["agua", "ltr", "es", "latin"],
      ["ماء", "rtl", "ar", "arabic"],
      ["水", "ltr", "zh", "han"],
      ["みず", "ltr", "ja", "kana"],
    ]);
    expect(rows[1].querySelector(".ipa")!.getAttribute("dir")).toBe("ltr");
    expect(rows[1].querySelector(".word-hit-meaning")!.getAttribute("dir")).toBe("ltr");
    expect(rows[3].querySelector(".ipa")).toBeNull();
    expect(rows[1].querySelector("a")!.getAttribute("href")).toBe(`https://en.wiktionary.org/wiki/${encodeURIComponent("ماء")}`);
    const text = v.host.textContent!;
    expect(text).toContain("4 matches in 780,207 words across 27 languages");
    const credit = v.host.querySelector(".word-hits .word-credit")!;
    expect(credit.textContent).toContain("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0");
    expect(Array.from(credit.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(["https://en.wiktionary.org", "https://kaikki.org", "https://creativecommons.org/licenses/by-sa/3.0/"]);
    expect(FORMAT_WORDS.test(text)).toBe(false);
    await v.unmount();
  });

  test("no match and a failed search each read as one plain sentence, with the attribution kept on results", async () => {
    const none = await search({ wordSearch: async () => NO_WORD_HITS_BODY }, "qqq");
    expect(none.host.textContent).toContain("No word matches. Bucket looked in 780,207 words across 27 languages.");
    expect(none.host.querySelector(".word-credit")).not.toBeNull();
    expect(none.host.querySelectorAll(".word-hit").length).toBe(0);
    await none.unmount();
    const failed = await search({ wordSearch: () => Promise.reject(new ApiError("SQLITE_ERROR: fts5 syntax error near x", 500)) }, "x");
    expect(failed.host.querySelector(".error")!.textContent).toBe("Word search did not run.");
    expect(failed.host.textContent).not.toContain("SQLITE");
    await failed.unmount();
  });
});

describe("installed decks in Settings", () => {
  test("lists each language with its word count, size, source, licence and curator", async () => {
    const { InstalledDecks } = await import("./views/Decks");
    const v = await render(<InstalledDecks api={{ installedDecks: async () => DECKS_BODY }} />);
    const rows = Array.from(v.host.querySelectorAll(".deck-rows li")).map((li) => li.textContent);
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain("Spanish words");
    expect(rows[0]).toContain("755,090 words · 96.0 MB");
    expect(rows[0]).toContain("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0 · curated by Bucket Foundation");
    expect(rows[1]).toContain("24,278 words · 5.0 MB");
    expect(v.host.querySelector(".deck-rows a")!.getAttribute("href")).toBe("https://creativecommons.org/licenses/by-sa/3.0/");
    expect(v.host.querySelector(".word-credit")!.textContent).toContain("Wiktionary");
    expect(FORMAT_WORDS.test(v.host.textContent!)).toBe(false);
    await v.unmount();
  });

  test("none installed and a failed read each say so in a sentence", async () => {
    const { InstalledDecks, NO_DECKS, DECKS_FAILED } = await import("./views/Decks");
    const none = await render(<InstalledDecks api={{ installedDecks: async () => NO_DECKS_BODY }} />);
    expect(none.host.textContent).toContain(NO_DECKS);
    await none.unmount();
    const failed = await render(<InstalledDecks api={{ installedDecks: () => Promise.reject(new ApiError("data key does not match", 500)) }} />);
    expect(failed.host.querySelector(".error")!.textContent).toBe(DECKS_FAILED);
    expect(failed.host.textContent).not.toContain("data key");
    await failed.unmount();
  });

  test("sizes and counts read in plain units", async () => {
    const { deckCount, sizeText } = await import("./views/Decks");
    expect([sizeText(900), sizeText(3 * 1024 * 1024), sizeText(2.5 * 1024 ** 3)]).toEqual(["1 KB", "3.0 MB", "2.5 GB"]);
    expect([deckCount({ cards: 1234567, kind: "words" }), deckCount({ cards: 40, kind: "cards" })]).toEqual(["1,234,567 words", "40 cards"]);
  });
});
