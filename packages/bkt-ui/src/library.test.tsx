import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { ApiError, type Api, type LibraryBody } from "./api";
import { EMPTY_LIBRARY, LIBRARY } from "./fixtures/library";
import { href, parseHash } from "./router";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const FORMAT_WORDS = /json|sqlite|sha256|\bzstd\b|polingual-(?!\w+\.bktdeck)|manifest|checksum|undefined|null|NaN|\b[0-9a-f]{12}\b/i;

type LibApi = Pick<Api, "library" | "libraryRefresh" | "libraryInstall" | "libraryRemove" | "libraryExport" | "libraryExportBytes" | "libraryImport">;

function stub(over: Partial<LibApi> = {}, body: LibraryBody = LIBRARY): LibApi & { calls: string[] } {
  const calls: string[] = [];
  const note = <T,>(name: string, value: T) => (calls.push(name), Promise.resolve(value));
  return {
    calls,
    library: () => note("library", body),
    libraryRefresh: () => note("refresh", { ...body, from: "refreshed" as const, refreshedAt: Date.UTC(2026, 9, 12) }),
    libraryInstall: (id) => note(`install ${id}`, { ...body, decks: body.decks.map((d) => (d.id === id ? { ...d, state: "downloading" as const, received: 0, error: null } : d)) }),
    libraryRemove: (id) => note(`remove ${id}`, { ...body, decks: body.decks.map((d) => (d.id === id ? { ...d, state: "available" as const } : d)) }),
    libraryExport: (id, replace) => note(`export ${id}${replace ? " replace" : ""}`, { name: `${id}.bktdeck`, folder: "Downloads" }),
    libraryExportBytes: (id) => note(`bytes ${id}`, new Blob(["deck"])),
    libraryImport: () => note("import", { ...body, installed: "Arabic words" }),
    ...over,
  };
}

async function show(api: LibApi) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { LibraryView } = await import("./views/Library");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<LibraryView api={api} />));
  const settle = () => act(async () => new Promise((r) => setTimeout(r, 0)));
  await settle();
  const row = (title: string) => Array.from(host.querySelectorAll(".library-row")).find((r) => r.querySelector("b")!.textContent === title)!;
  const press = async (within: Element, label: string) => {
    const b = Array.from(within.querySelectorAll("button")).find((x) => x.textContent?.trim() === label) as HTMLButtonElement;
    await act(async () => b.click());
    await settle();
  };
  return { host, row, press, act, settle, unmount: () => act(async () => root.unmount()) };
}

describe("library screen", () => {
  test("opens from its own address, reached from Learn and Settings", async () => {
    expect(parseHash("#/library")).toEqual({ name: "library" });
    expect(href({ name: "library" })).toBe("#/library");
    const { NAV } = await import("./nav");
    expect(NAV.map((n) => n.label)).not.toContain("Library");
    const { LIBRARY_LINK } = await import("./views/Decks");
    expect(LIBRARY_LINK).toBe("Add more decks from the Library");
  });

  test("lists each deck with its size, card count, licence and curator, in plain words", async () => {
    const api = stub();
    const v = await show(api);
    expect(api.calls).toEqual(["library"]);
    expect(v.host.querySelectorAll(".library-row").length).toBe(6);
    const es = v.row("Spanish words").textContent!;
    for (const want of ["755,090 words · 30.0 MB to download", "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0 · curated by Bucket Foundation", "Not added", "Download"]) expect(es).toContain(want);
    expect(v.row("Spanish words").querySelector("a")!.getAttribute("href")).toBe("https://creativecommons.org/licenses/by-sa/3.0/");
    const de = v.row("German words").textContent!;
    for (const want of ["102.0 MB on this computer", "Added", "Save as a file", "Remove"]) expect(de).toContain(want);
    expect(de).not.toContain("Download");
    expect(v.row("Japanese words").textContent).toContain("Newer version ready");
    expect(v.row("Japanese words").textContent).toContain("Update");
    const own = v.row("Kitchen French").textContent!;
    for (const want of ["40 cards", "CC0 · curated by Ada", "Added"]) expect(own).toContain(want);
    expect(own).not.toContain("Update");
    expect(v.host.textContent).toContain("Bucket contacts bucket.foundation only when you choose Refresh or Download.");
    expect(v.host.textContent).toContain("List made on 2026-10-11.");
    expect(FORMAT_WORDS.test(v.host.textContent!)).toBe(false);
    await v.unmount();
  });

  test("a download shows a labelled progress bar and a failed one says why with Try again", async () => {
    const v = await show(stub());
    const bar = v.row("Arabic words").querySelector("progress")!;
    expect([bar.getAttribute("aria-label"), bar.getAttribute("value"), bar.getAttribute("max")]).toEqual(["Downloading Arabic words", "50", "100"]);
    expect(v.row("Arabic words").textContent).toContain("50 percent of 2.0 MB");
    expect(v.row("Arabic words").querySelector("button")).toBeNull();
    const fr = v.row("French words");
    expect(fr.querySelector(".error")!.textContent).toBe("The downloaded file did not match the catalog, so Bucket did not install it.");
    expect(fr.textContent).toContain("Try again");
    await v.unmount();
  });

  test("Download, Update, Remove, Save as a file and Refresh each call once and say what happened", async () => {
    const api = stub();
    const v = await show(api);
    await v.press(v.row("Spanish words"), "Download");
    expect(v.row("Spanish words").getAttribute("data-state")).toBe("downloading");
    await v.press(v.row("Japanese words"), "Update");
    await v.press(v.row("German words"), "Save as a file");
    expect(v.host.querySelector(".status")!.textContent).toBe("Saved German words as polingual-de.bktdeck in Downloads.");
    await v.press(v.row("German words"), "Remove");
    expect(v.host.querySelector(".status")!.textContent).toBe("Removed German words.");
    await v.press(v.host, "Refresh");
    expect(v.host.querySelector(".status")!.textContent).toBe("The list is up to date.");
    expect(v.host.textContent).toContain("List from bucket.foundation, read on 2026-10-12.");
    expect(v.host.textContent).not.toContain("This is the list that came with this copy of Bucket.");
    expect(api.calls).toEqual(["library", "install polingual-es", "install polingual-ja", "export polingual-de", "remove polingual-de", "refresh"]);
    await v.unmount();
  });

  test("saving asks where through the window's own dialog when it has one, and cancelling writes nothing", async () => {
    const api = stub();
    const wrote: string[] = [];
    const asked: string[] = [];
    let cancel = false;
    (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker = async (o: { suggestedName: string }) => {
      asked.push(o.suggestedName);
      if (cancel) throw new DOMException("cancelled", "AbortError");
      return { createWritable: async () => ({ write: async (b: Blob) => void wrote.push(await b.text()), close: async () => void wrote.push("closed") }) };
    };
    try {
      const v = await show(api);
      await v.press(v.row("German words"), "Save as a file");
      expect(asked).toEqual(["german-words.bktdeck"]);
      expect(wrote).toEqual(["deck", "closed"]);
      expect(v.host.querySelector(".status")!.textContent).toBe("Saved German words.");
      cancel = true;
      await v.press(v.row("German words"), "Save as a file");
      expect(api.calls).toEqual(["library", "bytes polingual-de"]);
      expect(v.host.querySelector(".status")).toBeNull();
      await v.unmount();
    } finally {
      delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    }
  });

  test("without that dialog, a file that already exists is replaced only after a yes", async () => {
    const { replaceQuestion, NOTHING_REPLACED } = await import("./views/Library");
    const calls: string[] = [];
    const questions: string[] = [];
    let answer = false;
    const keep = window.confirm;
    window.confirm = (q?: string) => (questions.push(q ?? ""), answer);
    try {
      const api = stub({ libraryExport: (id, replace) => (calls.push(`${id}:${replace === true}`), replace ? Promise.resolve({ name: "polingual-de.bktdeck", folder: "Downloads" }) : Promise.reject(new ApiError("exists", 409))) });
      const v = await show(api);
      await v.press(v.row("German words"), "Save as a file");
      expect(questions).toEqual([replaceQuestion({ title: "German words" })]);
      expect(calls).toEqual(["polingual-de:false"]);
      expect(v.host.querySelector(".status")!.textContent).toBe(NOTHING_REPLACED);
      answer = true;
      await v.press(v.row("German words"), "Save as a file");
      expect(calls).toEqual(["polingual-de:false", "polingual-de:false", "polingual-de:true"]);
      expect(v.host.querySelector(".status")!.textContent).toBe("Saved German words as polingual-de.bktdeck in Downloads.");
      await v.unmount();
    } finally {
      window.confirm = keep;
    }
  });

  test("an unsigned list shows no catalog deck and says why", async () => {
    const { UNSIGNED_LIST } = await import("./views/Library");
    const v = await show(stub({}, { ...EMPTY_LIBRARY, offline: false }));
    expect(v.host.textContent).toContain(UNSIGNED_LIST);
    expect(v.host.querySelectorAll(".library-row").length).toBe(0);
    expect(v.host.querySelector('input[type="file"]')).not.toBeNull();
    await v.unmount();
  });

  test("offline, Refresh and Download are off and the screen says why; a file still adds a deck", async () => {
    const api = stub({}, { ...LIBRARY, offline: true });
    const v = await show(api);
    expect(v.host.textContent).toContain("Bucket is set to stay offline on this computer.");
    const button = (within: Element, label: string) => Array.from(within.querySelectorAll("button")).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
    expect(button(v.host, "Refresh").disabled).toBe(true);
    expect(button(v.row("Spanish words"), "Download").disabled).toBe(true);
    expect(button(v.row("German words"), "Remove").disabled).toBe(false);
    const input = v.host.querySelector('input[type="file"]') as HTMLInputElement;
    expect([input.disabled, input.getAttribute("aria-label"), input.getAttribute("accept")]).toEqual([false, "Add a deck from a file", ".bktdeck"]);
    Object.defineProperty(input, "files", { value: [new File(["x"], "arabic.bktdeck")], configurable: true });
    await v.act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await v.settle();
    expect(api.calls).toEqual(["library", "import"]);
    expect(v.host.querySelector(".status")!.textContent).toBe("Added Arabic words.");
    await v.unmount();
  });

  test("a refused file, a failed refresh and a failed load each read as one plain sentence", async () => {
    const { IMPORT_TROUBLE, IMPORT_NO_LICENCE, REFRESH_TROUBLE, LIBRARY_FAILED } = await import("./views/Library");
    const pick = async (api: LibApi) => {
      const v = await show(api);
      const input = v.host.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, "files", { value: [new File(["x"], "x.bktdeck")], configurable: true });
      await v.act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
      await v.settle();
      const said = v.host.querySelector(".status")!.textContent;
      await v.unmount();
      return said;
    };
    expect(await pick(stub({ libraryImport: () => Promise.reject(new ApiError("/tmp/.upload.1 is not a Bucket deck file", 400)) }))).toBe(IMPORT_TROUBLE);
    expect(await pick(stub({ libraryImport: () => Promise.reject(new ApiError("the deck manifest names no licence; Bucket installs a deck only when its licence is stated", 400)) }))).toBe(IMPORT_NO_LICENCE);
    const v = await show(stub({ libraryRefresh: () => Promise.reject(new ApiError("fetch failed ECONNREFUSED 10.0.0.1", 502)) }));
    await v.press(v.host, "Refresh");
    expect(v.host.querySelector(".status")!.textContent).toBe(REFRESH_TROUBLE);
    expect(v.host.textContent).not.toContain("ECONNREFUSED");
    await v.unmount();
    const down = await show(stub({ library: () => Promise.reject(new ApiError("data key does not match", 500)) }));
    expect(down.host.querySelector(".error")!.textContent).toBe(LIBRARY_FAILED);
    await down.unmount();
    const none = await show(stub({}, EMPTY_LIBRARY));
    expect(none.host.querySelectorAll(".library-row").length).toBe(0);
    await none.unmount();
  });

  test("progress and the list line are worked out from the numbers", async () => {
    const { percent, listedLine } = await import("./views/Library");
    expect([percent({ received: 0, downloadBytes: 10 }), percent({ received: 5, downloadBytes: 10 }), percent({ received: 50, downloadBytes: 10 }), percent({ received: 1, downloadBytes: 0 })]).toEqual([0, 50, 100, 100]);
    expect(listedLine({ from: "bundled", refreshedAt: null, built: "2026-10-11" })).toBe("List made on 2026-10-11.");
  });
});
