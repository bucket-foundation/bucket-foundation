import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadUi } from "../../bkt/src/serve";

let threeDmol: () => unknown = () => ({});
mock.module("3dmol", () => threeDmol());

beforeAll(() => {
  GlobalRegistrator.register({ url: "http://127.0.0.1:4100/" });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

async function mountProtein(fetcher: typeof fetch) {
  window.fetch = fetcher;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { default: ProteinView, PROTEIN_OFFLINE } = await import("@/components/explore/ProteinView");
  const { proteinById } = await import("@/lib/explore/protein");
  const { PROTEINS } = await import("@/lib/explore/protein");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const protein = proteinById(PROTEINS[0].id);
  await act(async () => root.render(<ProteinView protein={protein} focus={null} onFocus={() => {}} upload={null} />));
  for (let i = 0; i < 20; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  const text = host.textContent ?? "";
  await act(async () => root.unmount());
  return { text, PROTEIN_OFFLINE };
}

describe("Explore modes offline", () => {
  test("a fixture the window cannot fetch shows one plain sentence and no status code", async () => {
    const { text, PROTEIN_OFFLINE } = await mountProtein((async () => new Response("", { status: 401 })) as unknown as typeof fetch);
    expect(text).toContain(PROTEIN_OFFLINE);
    expect(text).not.toMatch(/fixture|\b401\b/);
  });

  test("a 3D library that fails to load shows the same plain sentence", async () => {
    threeDmol = () => {
      throw new Error("blocked by the content policy");
    };
    const { text, PROTEIN_OFFLINE } = await mountProtein((async () => new Response("HEADER\nEND\n")) as unknown as typeof fetch);
    expect(text).toContain(PROTEIN_OFFLINE);
    expect(text).not.toContain("content policy");
  });

  test("the window ships and serves the protein fixture and the sample genome", () => {
    const files = ["explore/sample-genome.txt", "explore/fixtures/apoe3-nterm.pdb"];
    const config = readFileSync(resolve(import.meta.dir, "../vite.config.ts"), "utf8");
    for (const f of files) expect([f, config.includes(`"${f}"`)]).toEqual([f, true]);
    const dist = mkdtempSync(join(tmpdir(), "bkt-ui-dist-"));
    try {
      for (const f of files) {
        mkdirSync(dirname(join(dist, f)), { recursive: true });
        copyFileSync(resolve(import.meta.dir, "../../../public", f), join(dist, f));
      }
      const ui = loadUi(dist);
      for (const f of files) expect([f, ui.files.has(`/${f}`)]).toEqual([f, true]);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});
