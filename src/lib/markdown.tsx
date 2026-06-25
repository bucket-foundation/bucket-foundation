/**
 * Minimal, zero-dependency Markdown → React renderer.
 * Handles: # h1–h6, paragraphs, ul/ol, bold, italic, inline code, fenced code,
 *          links, images, GitHub-style tables, blockquotes, horizontal rule.
 * Designed for bucket.foundation's strategic docs (MANIFESTO, PROTOCOL,
 * GOVERNANCE) and the long-form research corpora (research-atlas papers,
 * education-atlas) which use a small, disciplined subset of markdown plus
 * tables and figures.
 */
import React from "react";

type Block =
  | { t: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "code"; lang: string; body: string }
  | { t: "quote"; text: string }
  | { t: "table"; header: string[]; rows: string[][] }
  | { t: "img"; src: string; alt: string }
  | { t: "hr" };

// A line that is *only* an image: ![alt](url)
const IMG_ONLY = /^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/;
// A table row: starts and ends (after trim) with a pipe and has at least one more.
function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.indexOf("|", 1) > 0;
}
// The separator row under a table header: | --- | :--: | etc.
function isTableSep(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(t);
}
function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim();
      i++;
      const buf: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // consume closing
      blocks.push({ t: "code", lang, body: buf.join("\n") });
      continue;
    }

    // blank
    if (/^\s*$/.test(line)) { i++; continue; }

    // hr
    if (/^\s*---+\s*$/.test(line) || /^\s*\*\*\*+\s*$/.test(line)) {
      blocks.push({ t: "hr" }); i++; continue;
    }

    // headings (1–6)
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ t: "h", level: h[1].length as 1 | 2 | 3 | 4 | 5 | 6, text: h[2].trim() });
      i++; continue;
    }

    // image-only line → block-level figure
    const im = IMG_ONLY.exec(line);
    if (im) {
      blocks.push({ t: "img", alt: im[1].trim(), src: im[2].trim() });
      i++; continue;
    }

    // GitHub-style table: a header row followed by a separator row
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2; // consume header + separator
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]) && !isTableSep(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ t: "table", header, rows });
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ t: "quote", text: buf.join(" ") });
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ t: "ul", items });
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ t: "ol", items });
      continue;
    }

    // paragraph (collect until blank / block boundary)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i]) &&
      !IMG_ONLY.test(lines[i]) &&
      !isTableRow(lines[i])
    ) {
      buf.push(lines[i]); i++;
    }
    blocks.push({ t: "p", text: buf.join(" ") });
  }
  return blocks;
}

// Inline renderer — bold **x**, italic *x*/_x_, inline code `x`, links [t](u)
function inline(text: string, key: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let rest = text;
  let idx = 0;
  const push = (n: React.ReactNode) => out.push(<React.Fragment key={`${key}-${idx++}`}>{n}</React.Fragment>);
  const PAT = /(`[^`]+`|!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/;
  while (rest.length) {
    const m = PAT.exec(rest);
    if (!m) { push(rest); break; }
    if (m.index > 0) push(rest.slice(0, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      push(<code className="font-mono-mark text-[color:var(--gold)] text-[0.92em]">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("![")) {
      const im = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(tok)!;
      // eslint-disable-next-line @next/next/no-img-element
      push(<img src={im[2]} alt={im[1]} className="inline-block max-w-full h-auto align-middle" />);
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      push(<strong className="text-[color:var(--parchment)]">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*") || tok.startsWith("_")) {
      push(<em>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith("[")) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      push(<a href={lm[2]} className="text-[color:var(--gold)] hover:text-[color:var(--parchment)] underline-offset-4 hover:underline">{lm[1]}</a>);
    }
    rest = rest.slice(m.index + tok.length);
  }
  return <>{out}</>;
}

export function Markdown({ source }: { source: string }) {
  const blocks = parse(source);
  return (
    <div className="prose-bucket">
      {blocks.map((b, k) => {
        if (b.t === "h") {
          const Tag = (`h${b.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6");
          const sizes = {
            1: "font-serif-display text-4xl md:text-5xl text-[color:var(--parchment)] mt-12 mb-6",
            2: "font-serif-display text-3xl text-[color:var(--parchment)] mt-12 mb-5",
            3: "font-serif-display text-xl text-[color:var(--gold)] mt-8 mb-3 small-caps",
            4: "font-serif-display text-lg text-[color:var(--parchment)] mt-7 mb-2",
            5: "small-caps text-sm text-[color:var(--gold)] mt-6 mb-2 tracking-[0.08em]",
            6: "small-caps text-xs text-[color:var(--gold-dim)] mt-5 mb-2 tracking-[0.1em]",
          } as const;
          return <Tag key={k} className={sizes[b.level]}>{inline(b.text, `h${k}`)}</Tag>;
        }
        if (b.t === "p") {
          return <p key={k} className="text-lg text-[color:var(--parchment-dim)] leading-relaxed my-5 text-pretty">{inline(b.text, `p${k}`)}</p>;
        }
        if (b.t === "ul") {
          return <ul key={k} className="list-disc pl-6 my-5 space-y-2 text-[color:var(--parchment-dim)] marker:text-[color:var(--gold-dim)]">
            {b.items.map((it, j) => <li key={j} className="leading-relaxed">{inline(it, `ul${k}-${j}`)}</li>)}
          </ul>;
        }
        if (b.t === "ol") {
          return <ol key={k} className="list-decimal pl-6 my-5 space-y-2 text-[color:var(--parchment-dim)] marker:text-[color:var(--gold-dim)]">
            {b.items.map((it, j) => <li key={j} className="leading-relaxed">{inline(it, `ol${k}-${j}`)}</li>)}
          </ol>;
        }
        if (b.t === "code") {
          return <pre key={k} className="my-6 p-4 bg-[color:var(--ink-2)] border hairline overflow-x-auto text-sm font-mono-mark text-[color:var(--parchment)]"><code>{b.body}</code></pre>;
        }
        if (b.t === "quote") {
          return <blockquote key={k} className="my-6 border-l-2 border-[color:var(--gold)] pl-5 italic text-[color:var(--parchment)]">{inline(b.text, `q${k}`)}</blockquote>;
        }
        if (b.t === "img") {
          return (
            <figure key={k} className="my-8">
              <div className="border hairline bg-white p-3 md:p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} className="w-full h-auto" loading="lazy" />
              </div>
              {b.alt && (
                <figcaption className="mt-3 text-sm leading-relaxed text-[color:var(--parchment-dim)]">
                  {b.alt}
                </figcaption>
              )}
            </figure>
          );
        }
        if (b.t === "table") {
          return (
            <div key={k} className="my-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    {b.header.map((c, j) => (
                      <th
                        key={j}
                        className="text-left font-display uppercase text-[11px] tracking-[0.08em] text-[color:var(--gold)] border-b hairline px-3 py-2 align-bottom"
                      >
                        {inline(c, `th${k}-${j}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri} className="border-b hairline">
                      {row.map((c, j) => (
                        <td
                          key={j}
                          className="px-3 py-2 align-top text-[color:var(--parchment-dim)] leading-relaxed"
                        >
                          {inline(c, `td${k}-${ri}-${j}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.t === "hr") {
          return <hr key={k} className="my-10 border-t hairline" />;
        }
        return null;
      })}
    </div>
  );
}
