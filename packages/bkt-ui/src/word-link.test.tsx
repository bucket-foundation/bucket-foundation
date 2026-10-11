import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { ApiError, type Api, type LinkSearch, type LinkStatus } from "./api";
import { WORD_HITS } from "./fixtures/decks";
import { WORD_CREDIT } from "./fixtures/word-lessons";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const LINKED: LinkStatus = { freeText: true, linked: true, place: "127.0.0.1:5433/polingual", reachable: true, words: 6564942 };
const UNLINKED: LinkStatus = { freeText: false, linked: false, place: null, reachable: false, words: null };
const NEAR: LinkSearch = {
  query: "water",
  mode: "meaning",
  from: { lang: "nl", name: "Dutch", word: "water", meaning: "water (H₂O)" },
  credit: WORD_CREDIT,
  hits: [
    { lang: "es", name: "Spanish", dir: "ltr", script: "latin", word: "agua", ipa: "ˈaɡwa", pos: "noun", meaning: "water", href: "https://en.wiktionary.org/wiki/agua", closeness: 0.95 },
    { lang: "ar", name: "Arabic", dir: "rtl", script: "arabic", word: "ماء", ipa: "maːʔ", pos: "noun", meaning: "water", href: "https://en.wiktionary.org/wiki/%D9%85%D8%A7%D8%A1", closeness: 0.92 },
    { lang: "zh", name: "Chinese", dir: "ltr", script: "han", word: "水", ipa: "", pos: "", meaning: "water", href: "https://en.wiktionary.org/wiki/%E6%B0%B4", closeness: 0.9 },
  ],
};

async function render(node: React.ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  const settle = () => act(async () => new Promise((r) => setTimeout(r, 0)));
  await settle();
  const type = async (input: HTMLInputElement, text: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const press = async (label: string) => {
    await act(async () => (Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label) as HTMLButtonElement).click());
    await settle();
  };
  const labels = () => Array.from(host.querySelectorAll("button")).map((b) => b.textContent?.trim());
  return { host, type, press, labels, settle, act, unmount: () => act(async () => root.unmount()) };
}

type BoxApi = Pick<Api, "wordSearch" | "polingualLink" | "linkSearch">;

describe("search by meaning and by sound", () => {
  test("the two buttons appear only when a word database is linked and answers", async () => {
    const { WordSearchBox } = await import("./views/Decks");
    const base = { wordSearch: async () => WORD_HITS, linkSearch: async () => NEAR };
    for (const [status, want] of [[LINKED, true], [UNLINKED, false], [{ ...LINKED, reachable: false }, false]] as [LinkStatus, boolean][]) {
      const v = await render(<WordSearchBox api={{ ...base, polingualLink: async () => status } as BoxApi} />);
      expect(v.labels().includes("Close in meaning")).toBe(want);
      expect(v.labels().includes("Sounds like")).toBe(want);
      await v.unmount();
    }
    const failing = await render(<WordSearchBox api={{ ...base, polingualLink: () => Promise.reject(new ApiError("x", 500)) } as BoxApi} />);
    expect(failing.labels()).toEqual(["Search words"]);
    await failing.unmount();
    const plain = await render(<WordSearchBox api={{ wordSearch: async () => WORD_HITS }} />);
    expect(plain.labels()).toEqual(["Search words"]);
    await plain.unmount();
  });

  test("results name the word the search started from, show each word in its script, and carry the attribution", async () => {
    const { WordSearchBox } = await import("./views/Decks");
    const asked: [string, string][] = [];
    const api: BoxApi = { wordSearch: async () => WORD_HITS, polingualLink: async () => LINKED, linkSearch: async (q, mode) => (asked.push([q, mode]), { ...NEAR, mode }) };
    const v = await render(<WordSearchBox api={api} />);
    await v.type(v.host.querySelector('input[type="search"]') as HTMLInputElement, " water ");
    await v.press("Close in meaning");
    expect(asked).toEqual([["water", "meaning"]]);
    expect(v.host.textContent).toContain("Words close in meaning to water (Dutch: water (H₂O)).");
    const forms = Array.from(v.host.querySelectorAll(".word-hit .word-form"));
    expect(forms.map((f) => [f.textContent, f.getAttribute("dir"), f.getAttribute("lang"), f.getAttribute("data-script")])).toEqual([
      ["agua", "ltr", "es", "latin"],
      ["ماء", "rtl", "ar", "arabic"],
      ["水", "ltr", "zh", "han"],
    ]);
    expect(v.host.textContent).toContain("95 percent close");
    expect(v.host.querySelector(".word-hits .word-credit")!.textContent).toContain("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0");
    await v.press("Sounds like");
    expect(asked[1]).toEqual(["water", "sound"]);
    expect(v.host.textContent).toContain("Words that sound like water");
    expect(/photon|vector|embedding|postgres|undefined|null|NaN/i.test(v.host.textContent!)).toBe(false);
    await v.press("Search words");
    expect(v.host.textContent).not.toContain("Words that sound like");
    expect(v.host.querySelectorAll(".word-hit").length).toBe(4);
    await v.unmount();
  });

  test("a word the database lacks and a database that stops answering each read as one sentence", async () => {
    const { WordSearchBox, LINK_NO_WORD, LINK_TROUBLE, LINK_BUSY } = await import("./views/Decks");
    for (const [status, want] of [[404, LINK_NO_WORD], [502, LINK_TROUBLE], [429, LINK_BUSY]] as [number, string][]) {
      const v = await render(<WordSearchBox api={{ wordSearch: async () => WORD_HITS, polingualLink: async () => LINKED, linkSearch: () => Promise.reject(new ApiError("canceling statement due to statement timeout", status)) }} />);
      await v.type(v.host.querySelector('input[type="search"]') as HTMLInputElement, "zzz");
      await v.press("Close in meaning");
      expect(v.host.querySelector(".status")!.textContent).toBe(want);
      expect(v.host.textContent).not.toContain("statement");
      await v.unmount();
    }
  });
});

describe("word database link in Settings", () => {
  test("shows where it is linked and never shows the saved address", async () => {
    const { WordDatabaseLink, LINK_FIELD } = await import("./views/Decks");
    const v = await render(<WordDatabaseLink api={{ polingualLink: async () => LINKED, setPolingualLink: async () => UNLINKED }} />);
    expect(v.host.textContent).toContain("Linked to 127.0.0.1:5433/polingual. It answers.");
    const input = v.host.querySelector("input") as HTMLInputElement;
    expect([input.type, input.value, input.getAttribute("aria-label"), input.getAttribute("autocomplete")]).toEqual(["password", "", LINK_FIELD, "off"]);
    expect(v.labels()).toEqual(["Save", "Remove link"]);
    await v.press("Remove link");
    expect(v.host.textContent).toContain("No word database is linked.");
    expect(v.host.querySelector(".status")!.textContent).toBe("Link removed.");
    expect(v.labels()).toEqual(["Save"]);
    await v.unmount();
  });

  test("saving sends the typed address once and clears the field; a refused address says why", async () => {
    const { WordDatabaseLink, LINK_REFUSED, linkLine } = await import("./views/Decks");
    const sent: string[] = [];
    const v = await render(<WordDatabaseLink api={{ polingualLink: async () => UNLINKED, setPolingualLink: async (u) => (sent.push(u), LINKED) }} />);
    const input = v.host.querySelector("input") as HTMLInputElement;
    await v.type(input, " postgres://u:p@127.0.0.1:5433/polingual ");
    await v.press("Save");
    expect(sent).toEqual(["postgres://u:p@127.0.0.1:5433/polingual"]);
    expect((v.host.querySelector("input") as HTMLInputElement).value).toBe("");
    expect(v.host.querySelector(".status")!.textContent).toBe("Saved.");
    await v.unmount();
    const no = await render(<WordDatabaseLink api={{ polingualLink: async () => UNLINKED, setPolingualLink: () => Promise.reject(new ApiError("x", 400)) }} />);
    await no.type(no.host.querySelector("input") as HTMLInputElement, "postgres://u:p@example.com/db");
    await no.press("Save");
    expect(no.host.querySelector(".status")!.textContent).toBe(LINK_REFUSED);
    await no.unmount();
    expect(linkLine({ linked: true, reachable: false, place: "localhost/db" })).toBe("Linked to localhost/db, and it did not answer just now.");
  });
});
