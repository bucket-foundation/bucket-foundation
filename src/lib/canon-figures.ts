import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(process.cwd());
const BIOS_DIR = path.join(REPO_ROOT, "canon-figures", "bios");

export function getFigureBio(slug: string): string | null {
  const file = path.join(BIOS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

export function hasFigureBio(slug: string): boolean {
  return fs.existsSync(path.join(BIOS_DIR, `${slug}.md`));
}

export function renderBioMarkdown(md: string): string {
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
    out.push('<dl class="bio-meta">');
    for (const row of inTable) {
      if (row.length < 2) continue;
      const label = inlineRender(row[0].trim());
      const value = inlineRender(row.slice(1).join(" | ").trim());
      if (/^[-:|\s]+$/.test(row.join(""))) continue;
      out.push(`<div><dt>${label}</dt><dd>${value}</dd></div>`);
    }
    out.push("</dl>");
    inTable = null;
  };

  function inlineRender(s: string): string {
    let r = esc(s);
    r = r.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
    r = r.replace(/`([^`]+)`/g, '<code>$1</code>');
    r = r.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    r = r.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    return r;
  }

  for (const line of lines) {
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushParagraph();
      if (inTable === null) inTable = [];
      const cells = line.trim().slice(1, -1).split("|");
      inTable.push(cells);
      continue;
    } else if (inTable !== null) {
      flushTable();
    }

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
      continue;
    }

    if (line.trim() === "---") {
      flushParagraph();
      out.push("<hr/>");
      continue;
    }

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
