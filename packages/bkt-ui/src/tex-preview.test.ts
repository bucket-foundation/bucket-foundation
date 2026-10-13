import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOCK_CAP, NODE_CAP, SOURCE_CAP, texPreview, type Block, type Inline } from "./tex-preview";

const MAIN = readFileSync(join(import.meta.dir, "../../../papers/solvability-frontier/main.tex"), "utf8");
const text = (inline: Inline[]) => inline.map((x) => (x.t === "math" ? `$${x.tex}$` : x.v)).join("");
const of = <K extends Block["k"]>(blocks: Block[], k: K) => blocks.filter((b): b is Extract<Block, { k: K }> => b.k === k);

describe("tex preview", () => {
  test("converter fixtures from main.tex", () => {
    const p = texPreview(MAIN);
    expect(p.truncated).toBe(false);
    const headings = of(p.blocks, "heading").map((h) => text(h.inline));
    expect(headings.slice(0, 5)).toEqual(["Introduction", "Origin: the Solver Gap Engine", "Related work", "Preliminaries", "Method"]);
    expect(of(p.blocks, "figure").map((f) => f.name)).toEqual(["fig_makeup.pdf", "fig_frontier.pdf", "fig_backtest.pdf", "fig_classes.pdf"]);
    expect(of(p.blocks, "table").map((t) => t.path)).toContain("tables/branches.tex");
    expect(of(p.blocks, "table").length).toBe(12);
    expect(of(p.blocks, "math")[0].tex).toContain("\\begin{cases}");
    const all = of(p.blocks, "para").map((b) => text(b.inline)).join("\n");
    expect(all).toContain("We embed 5,209 problem statements across seven canon branches");
    expect(all).toContain("call a problem's reach its highest similarity to a solved problem");
    expect(all).not.toContain("\\term");
    expect(all).not.toContain("\\begin{");
    expect(all).not.toContain("documentclass");
    expect(of(p.blocks, "para").some((b) => b.inline.some((x) => x.t === "math"))).toBe(true);
    expect(p.blocks.length).toBeGreaterThan(80);
    expect(p.blocks.length).toBeLessThan(BLOCK_CAP);
  });

  test("sections, paragraphs, lists and math become typed blocks", () => {
    const p = texPreview(
      [
        "\\documentclass{article}\\usepackage{amsmath}",
        "\\begin{document}",
        "\\title{A \\emph{short} paper}",
        "\\section{Method} % a comment with $ and {",
        "We take $x^2 + 1$ and \\textbf{bold} it, 50\\% of the time~here.\\footnote{A note.}",
        "",
        "Second paragraph cites \\cite{knuth84} and \\Cref{fig:a}.",
        "\\begin{itemize}",
        "\\item First $a$",
        "\\item[b] Second \\texttt{code}",
        "\\end{itemize}",
        "\\begin{enumerate}\\item One\\end{enumerate}",
        "\\begin{align}a &= b \\label{eq:1}\\\\ c &= d\\end{align}",
        "\\[ E = mc^2 \\] and $$ F = ma $$ and \\( p \\) inline.",
        "\\begin{tabular}{ll} a & b \\\\ \\end{tabular}",
        "\\subsection*{Results}",
        "\\end{document}",
        "\\section{After the end}",
      ].join("\n"),
    );
    expect(p.blocks.map((b) => b.k)).toEqual(["heading", "heading", "para", "para", "list", "list", "math", "math", "para", "math", "para", "heading"]);
    expect(p.blocks[0]).toEqual({ k: "heading", level: 1, inline: [{ t: "text", v: "A short paper" }] });
    expect(p.blocks[1]).toEqual({ k: "heading", level: 2, inline: [{ t: "text", v: "Method" }] });
    expect(p.blocks[2]).toEqual({ k: "para", inline: [{ t: "text", v: "We take " }, { t: "math", tex: "x^2 + 1" }, { t: "text", v: " and " }, { t: "strong", v: "bold" }, { t: "text", v: " it, 50% of the time here. (A note.)" }] });
    expect(text((p.blocks[3] as Extract<Block, { k: "para" }>).inline)).toBe("Second paragraph cites [knuth84] and the reference.");
    expect(p.blocks[4]).toEqual({ k: "list", ordered: false, items: [[{ t: "text", v: "First " }, { t: "math", tex: "a" }], [{ t: "text", v: "Second " }, { t: "code", v: "code" }]] });
    expect(p.blocks[5]).toEqual({ k: "list", ordered: true, items: [[{ t: "text", v: "One" }]] });
    expect(p.blocks[6]).toEqual({ k: "math", tex: "\\begin{aligned}a &= b \\\\ c &= d\\end{aligned}" });
    expect(p.blocks[7]).toEqual({ k: "math", tex: "E = mc^2" });
    expect(p.blocks[9]).toEqual({ k: "math", tex: "F = ma" });
    expect(text((p.blocks[10] as Extract<Block, { k: "para" }>).inline)).toBe("and $p$ inline.");
    expect(p.blocks[11]).toEqual({ k: "heading", level: 3, inline: [{ t: "text", v: "Results" }] });
  });

  test("href and url become links that carry the address as data, and no markup survives", () => {
    const p = texPreview("See \\href{https://example.org/a?b=1}{the \\emph{site}} or \\url{javascript:alert(1)}. <img src=x onerror=alert(1)> \\input{/etc/passwd} \\includegraphics[width=1cm]{../../secret.png}");
    const para = p.blocks[0] as Extract<Block, { k: "para" }>;
    expect(para.inline).toEqual([{ t: "text", v: "See " }, { t: "link", url: "https://example.org/a?b=1", v: "the site" }, { t: "text", v: " or " }, { t: "link", url: "javascript:alert(1)", v: "javascript:alert(1)" }, { t: "text", v: ". <img src=x onerror=alert(1)>" }]);
    expect(p.blocks[1]).toEqual({ k: "figure", name: "secret.png" });
    expect(p.blocks.some((b) => b.k === "table")).toBe(false);
  });

  test("unclosed math, braces and environments read as text and never hang", () => {
    expect(texPreview("cost is $5 and rising\n\nnext").blocks).toEqual([{ k: "para", inline: [{ t: "text", v: "cost is $5 and rising" }] }, { k: "para", inline: [{ t: "text", v: "next" }] }]);
    expect(texPreview("\\emph{open and \\begin{equation} x").blocks.length).toBe(1);
    expect(texPreview("").blocks).toEqual([]);
    expect(texPreview("\\").blocks).toEqual([]);
    expect(texPreview("\\section").blocks).toEqual([]);
  });

  test("1 MB adversarial source finishes under 200 ms", () => {
    const M = SOURCE_CAP;
    const cases: Record<string, string> = {
      braces: "{".repeat(M),
      dollars: "$a".repeat(M / 2),
      doubles: "$$".repeat(M / 2),
      options: "\\a[".repeat(Math.floor(M / 3)),
      begins: "\\begin{equation}".repeat(M / 16),
      brackets: "\\[".repeat(M / 2),
      items: `\\begin{itemize}${"\\item x ".repeat(M / 8)}`,
      nested: "\\emph{".repeat(Math.floor(M / 6)),
      links: "\\href{u}{t} ".repeat(Math.floor(M / 12)),
      paragraphs: "a\n\n".repeat(Math.floor(M / 3)),
      comments: "%".repeat(M),
      slashes: "\\".repeat(M),
      mixed: "\\section{$x_{".repeat(Math.floor(M / 13)),
    };
    texPreview(MAIN);
    for (const [name, source] of Object.entries(cases)) {
      const at = performance.now();
      const p = texPreview(source);
      const ms = performance.now() - at;
      expect({ name, fast: ms < 200, bounded: p.blocks.length <= BLOCK_CAP }).toEqual({ name, fast: true, bounded: true });
    }
    const long = texPreview(`${"word ".repeat(SOURCE_CAP / 5 - 10)}\\section{Late}`);
    expect([long.truncated, long.blocks.length]).toEqual([false, 2]);
    expect(texPreview("x".repeat(SOURCE_CAP + 10)).truncated).toBe(true);
    expect(texPreview("a\n\n".repeat(BLOCK_CAP + 10)).blocks.length).toBe(BLOCK_CAP);
    expect(texPreview("a\n\n".repeat(BLOCK_CAP + 10)).truncated).toBe(true);
    expect(NODE_CAP).toBeGreaterThan(BLOCK_CAP);
  });
});
