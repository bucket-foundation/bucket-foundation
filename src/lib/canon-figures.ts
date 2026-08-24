// canon-figures.ts, server-only filesystem reader for
// `canon-figures/bios/*.md`. Only 12 of the 99 figures have a hand-written
// bio on disk so far (curie-marie, einstein, helmholtz, hilbert, maxwell,
// mendeleev, newton, pauling, poincare, turing, von-neumann). The figure
// page falls back to figures.json metadata when no bio is present.

import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(process.cwd());
const BIOS_DIR = path.join(REPO_ROOT, "canon-figures", "bios");

/** Read the raw markdown body of a figure bio. Returns null if no bio. */
export function getFigureBio(slug: string): string | null {
  const file = path.join(BIOS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

/** True if a hand-written bio markdown exists for this figure id. */
export function hasFigureBio(slug: string): boolean {
  return fs.existsSync(path.join(BIOS_DIR, `${slug}.md`));
}

/**
 * Tiny markdown → safe-HTML renderer for the bios. Not a
 * general-purpose Markdown engine; just handles the subset we
 * use in `canon-figures/bios/`:
 *
 * - h1/h2/h3 (`# `, `## `, `### `)
 * - bold (`**x**`) and italic (`*x*`)
 * - inline code (`` `x` ``)
 * - links (`[text](url)`)
 * - paragraphs (double-newline separation)
 * - markdown tables (the metadata frontmatter at top of each bio)
 * - --- horizontal rule
 *
 * All output is escaped first, then the limited markdown tokens are
 * promoted to HTML, so it's safe to drop into `dangerouslySetInnerHTML`.
 */
export function renderBioMarkdown(md: string): string {
  // Escape HTML first.
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inParagraph: string[] = [];
  let inTable: string[][] | null = null;

  const flushParagraph = () => {
    if (inParagraph.length === 0) return;
    const text = inParagraph.join(" ");
    out.push(`<p>${inlineRender(text)}</p>`);
    inParagraph = [];
  };

  const flushTable = () => {
    if (!inTable) return;
    // Each row is two cells (label, value). We render a definition-list.
    out.push('<dl class="bio-meta">');
    for (const row of inTable) {
      if (row.length < 2) continue;
      const label = inlineRender(row[0].trim());
      const value = inlineRender(row.slice(1).join(" | ").trim());
      // Skip separator rows like "|---|---|"
      if (/^[-:|\s]+$/.test(row.join(""))) continue;
      out.push(`<div><dt>${label}</dt><dd>${value}</dd></div>`);
    }
    out.push("</dl>");
    inTable = null;
  };

  // Inline-token render: bold, italic, code, links.
  function inlineRender(s: string): string {
    let r = esc(s);
    // Links [text](url), apply BEFORE we touch `*` patterns.
    r = r.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
    // Inline code `x`.
    r = r.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold **x**.
    r = r.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Italic *x* (must be after bold so we don't double-process **x**).
    r = r.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    return r;
  }

  for (const line of lines) {
    // Table rows
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushParagraph();
      if (inTable === null) inTable = [];
      const cells = line.trim().slice(1, -1).split("|");
      inTable.push(cells);
      continue;
    } else if (inTable !== null) {
      flushTable();
    }

    // Headings
    if (line.startsWith("### ")) {
      flushParagraph();
      out.push(`<h3>${inlineRender(line.slice(4).trim())}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      out.push(`<h2>${inlineRender(line.slice(3).trim())}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      // Skip the H1, the page header already shows the figure name.
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      flushParagraph();
      out.push("<hr/>");
      continue;
    }

    // Blank line → paragraph break
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    inParagraph.push(line);
  }

  flushParagraph();
  flushTable();

  return out.join("\n");
}
