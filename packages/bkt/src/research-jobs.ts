import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { JobDirs, JobSpec } from "./jobs";
import type { Os } from "./platform";

export type Which = (bin: string) => string | null;

export const PAGES_KIND = "research-pages";
export const PAGES_TIMEOUT_MS = 60_000;
export const PAGES_DPI = 150;
export const PAGES_MAX = 200;
export const PAGES_OUT_BYTES = 256 * 1024 * 1024;
export const FROZEN_PDF = "paper.pdf";
export const PAGE_FILE = /^page-(\d{1,3})\.png$/;

export const TOOLS = ["pdflatex", "biber", "pdftoppm"] as const;
export type Tool = (typeof TOOLS)[number];

export const TOOL_USE: Record<Tool, string> = {
  pdflatex: "Paper compiler",
  biber: "Bibliography",
  pdftoppm: "Paper pages",
};

const INSTALL: Record<Os, Record<Tool, string>> = {
  linux: {
    pdflatex: "sudo dnf install texlive-scheme-medium, or sudo apt install texlive-latex-extra",
    biber: "sudo dnf install biber, or sudo apt install biber",
    pdftoppm: "sudo dnf install poppler-utils, or sudo apt install poppler-utils",
  },
  darwin: {
    pdflatex: "brew install --cask mactex-no-gui",
    biber: "brew install --cask mactex-no-gui",
    pdftoppm: "brew install poppler",
  },
  win32: {
    pdflatex: "winget install MiKTeX.MiKTeX",
    biber: "winget install MiKTeX.MiKTeX",
    pdftoppm: "winget install oschwartz10612.Poppler",
  },
};

export function toolInstall(tool: Tool, os: Os): string {
  return INSTALL[os][tool];
}

export function pagesArgv(pdftoppm: string, dirs: JobDirs): string[] {
  return [pdftoppm, "-png", "-r", String(PAGES_DPI), "-f", "1", "-l", String(PAGES_MAX), join(dirs.dir, FROZEN_PDF), join(dirs.out, "page")];
}

export function pageFiles(out: string): { n: number; file: string }[] {
  return readdirSync(out)
    .map((name) => ({ name, m: PAGE_FILE.exec(name) }))
    .filter((x): x is { name: string; m: RegExpExecArray } => x.m !== null)
    .map((x) => ({ n: Number(x.m[1]), file: join(out, x.name) }))
    .sort((a, b) => a.n - b.n);
}

export function researchSpecs(o: { os: Os; which?: Which }): Record<string, JobSpec> {
  const which = o.which ?? ((bin: string) => Bun.which(bin));
  return {
    [PAGES_KIND]: {
      label: "Render the pages of a paper",
      inputs: {},
      timeoutMs: PAGES_TIMEOUT_MS,
      plan(dirs) {
        const bin = which("pdftoppm");
        if (!bin) return { error: "pdftoppm is missing, so the paper shows as a preview", install: toolInstall("pdftoppm", o.os) };
        return { argv: pagesArgv(bin, dirs), env: {} };
      },
      after(dirs) {
        const pages = pageFiles(dirs.out);
        if (pages.length === 0) throw new Error("the paper produced no page");
        const bytes = pages.reduce((sum, p) => sum + statSync(p.file).size, 0);
        if (bytes > PAGES_OUT_BYTES) throw new Error("the pages are over the 256 MB limit");
        return { pages: pages.length, bytes };
      },
    },
  };
}
