export type Inline = { t: "text" | "em" | "strong" | "code"; v: string } | { t: "math"; tex: string } | { t: "link"; url: string; v: string };

export type Block =
  | { k: "heading"; level: 1 | 2 | 3; inline: Inline[] }
  | { k: "para"; inline: Inline[] }
  | { k: "list"; ordered: boolean; items: Inline[][] }
  | { k: "math"; tex: string }
  | { k: "figure"; name: string }
  | { k: "table"; path: string };

export interface Preview {
  blocks: Block[];
  truncated: boolean;
}

export const SOURCE_CAP = 1_000_000;
export const BLOCK_CAP = 5_000;
export const INLINE_MATH_CAP = 2_000;
export const DISPLAY_MATH_CAP = 20_000;

const HEADINGS: Record<string, 1 | 2 | 3> = { title: 1, section: 2, subsection: 3, subsubsection: 3, paragraph: 3 };
const LISTS = new Set(["itemize", "enumerate", "description"]);
const DISPLAY = new Set(["equation", "align", "gather", "multline", "eqnarray", "displaymath", "alignat", "flalign"]);
const ALIGNED = new Set(["align", "eqnarray", "alignat", "flalign"]);
const SKIPPED = new Set(["tabular", "tabularx", "longtable", "tikzpicture", "lstlisting", "verbatim", "thebibliography", "filecontents"]);
const STYLED: Record<string, "em" | "strong" | "code"> = { emph: "em", textit: "em", textsl: "em", textbf: "strong", textsc: "strong", texttt: "code", path: "code", nolinkurl: "code" };
const CITES = new Set(["cite", "citep", "citet", "parencite", "textcite", "autocite", "footcite"]);
const REFS = new Set(["ref", "Cref", "cref", "eqref", "autoref", "pageref"]);
const DROP_ARGS = new Set(["label", "vspace", "hspace", "bibliographystyle", "bibliography", "addbibresource", "usepackage", "documentclass", "newcommand", "renewcommand", "setlength", "author", "date", "thanks", "pagestyle", "input@path", "graphicspath", "hypersetup", "definecolor", "color", "phantom"]);
const KEYED = new Set(["term", "hyperlink", "hypertarget", "textcolor", "glossentry", "colorbox", "hyperref"]);
export const NODE_CAP = 100_000;
const LITERAL = new Set(["%", "&", "_", "$", "#", "{", "}"]);
const RUN = /[^\\$%{}~\n]+/y;
const NAME = /[A-Za-z@]+\*?/y;

function matchBraces(s: string): Int32Array {
  const close = new Int32Array(s.length).fill(-1);
  const stack: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 92) i += 1;
    else if (c === 123) stack.push(i);
    else if (c === 125 && stack.length) close[stack.pop()!] = i;
  }
  return close;
}

function findDollar(s: string, from: number, cap: number): number {
  const end = Math.min(s.length, from + cap);
  for (let i = from; i < end; i++) {
    const c = s.charCodeAt(i);
    if (c === 92) i += 1;
    else if (c === 36) return i;
    else if (c === 10 && s.charCodeAt(i + 1) === 10) return -1;
  }
  return -1;
}

function plain(s: string, from: number, to: number): string {
  let out = "";
  for (let i = from; i < to; i++) {
    const ch = s[i];
    if (ch === "\\") {
      NAME.lastIndex = i + 1;
      const m = NAME.exec(s);
      if (m) i += m[0].length;
      else if (i + 1 < to) {
        out += LITERAL.has(s[i + 1]) ? s[i + 1] : " ";
        i += 1;
      }
    } else if (ch === "~" || ch === "\n") out += " ";
    else if (ch !== "{" && ch !== "}" && ch !== "$") out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

export function texPreview(source: string): Preview {
  let truncated = source.length > SOURCE_CAP;
  let s = truncated ? source.slice(0, SOURCE_CAP) : source;
  const begin = s.indexOf("\\begin{document}");
  if (begin >= 0) {
    const end = s.indexOf("\\end{document}", begin);
    s = s.slice(begin + 16, end >= 0 ? end : s.length);
  }
  const close = matchBraces(s);
  const blocks: Block[] = [];
  let inline: Inline[] = [];
  let text = "";
  let list: { ordered: boolean; items: Inline[][] } | null = null;
  const next = new Map<string, number>();
  const findWithin = (needle: string, from: number, cap: number): number => {
    let hit = next.get(needle);
    if (hit === undefined || (hit !== -1 && hit < from)) {
      hit = s.indexOf(needle, from);
      next.set(needle, hit);
    }
    return hit >= 0 && hit - from <= cap ? hit : -1;
  };

  const flushText = () => {
    const v = text.replace(/\s+/g, " ");
    text = "";
    if (v === "" || (v === " " && inline.length === 0)) return;
    const last = inline[inline.length - 1];
    if (last && last.t === "text") last.v += v;
    else inline.push({ t: "text", v });
  };
  const takeInline = (): Inline[] => {
    flushText();
    const out = inline;
    inline = [];
    const tail = out[out.length - 1];
    if (tail && tail.t === "text") tail.v = tail.v.trimEnd();
    if (out[0] && out[0].t === "text") out[0].v = out[0].v.trimStart();
    return out.filter((x) => x.t !== "text" || x.v !== "");
  };
  const flush = () => {
    const got = takeInline();
    if (got.length === 0) return;
    if (list) {
      if (list.items.length === 0) list.items.push(got);
      else list.items[list.items.length - 1].push(...got);
    } else blocks.push({ k: "para", inline: got });
  };
  const closeList = () => {
    flush();
    if (list && list.items.length) blocks.push({ k: "list", ordered: list.ordered, items: list.items });
    list = null;
  };
  const block = (b: Block) => {
    if (list) closeList();
    else flush();
    blocks.push(b);
  };
  const group = (at: number): [number, number] | null => {
    let i = at;
    while (s[i] === " " || s[i] === "\n") i += 1;
    return s[i] === "{" && close[i] >= 0 ? [i + 1, close[i]] : null;
  };
  const optional = (at: number): number => {
    if (s[at] !== "[") return at;
    const end = findWithin("]", at, 400);
    return end < 0 ? at : end + 1;
  };

  let nodes = 0;
  let i = 0;
  while (i < s.length) {
    nodes += 1;
    if (blocks.length >= BLOCK_CAP || nodes >= NODE_CAP) {
      truncated = true;
      break;
    }
    RUN.lastIndex = i;
    const run = RUN.exec(s);
    if (run) {
      text += run[0];
      i += run[0].length;
      continue;
    }
    const ch = s[i];
    if (ch === "\n") {
      if (s[i + 1] === "\n") {
        if (list) flushText();
        else flush();
        while (s[i] === "\n") i += 1;
      } else {
        text += " ";
        i += 1;
      }
    } else if (ch === "%") {
      const eol = s.indexOf("\n", i);
      i = eol < 0 ? s.length : eol + 1;
    } else if (ch === "~") {
      text += " ";
      i += 1;
    } else if (ch === "{" || ch === "}") {
      i += 1;
    } else if (ch === "$") {
      if (s[i + 1] === "$") {
        const end = findWithin("$$", i + 2, DISPLAY_MATH_CAP);
        if (end < 0) {
          text += "$$";
          i += 2;
        } else {
          block({ k: "math", tex: s.slice(i + 2, end).trim() });
          i = end + 2;
        }
      } else {
        const end = findDollar(s, i + 1, INLINE_MATH_CAP);
        if (end < 0) {
          text += "$";
          i += 1;
        } else {
          flushText();
          inline.push({ t: "math", tex: s.slice(i + 1, end).trim() });
          i = end + 1;
        }
      }
    } else {
      NAME.lastIndex = i + 1;
      const m = NAME.exec(s);
      if (!m) {
        const after = s[i + 1] ?? "";
        if (after === "[" || after === "(") {
          const closer = after === "[" ? "\\]" : "\\)";
          const end = findWithin(closer, i + 2, after === "[" ? DISPLAY_MATH_CAP : INLINE_MATH_CAP);
          if (end < 0) i += 2;
          else {
            const tex = s.slice(i + 2, end).trim();
            if (after === "[") block({ k: "math", tex });
            else {
              flushText();
              inline.push({ t: "math", tex });
            }
            i = end + 2;
          }
        } else {
          text += LITERAL.has(after) ? after : " ";
          i += 2;
        }
        continue;
      }
      const name = m[0].replace(/\*$/, "");
      let at = i + 1 + m[0].length;
      const arg = () => {
        at = optional(at);
        const g = group(at);
        if (g) at = g[1] + 1;
        return g;
      };
      if (name in HEADINGS) {
        const g = arg();
        if (g) block({ k: "heading", level: HEADINGS[name], inline: [{ t: "text", v: plain(s, g[0], g[1]) }] });
      } else if (name === "begin" || name === "end") {
        const g = group(at);
        const env = g ? s.slice(g[0], g[1]).replace(/\*$/, "") : "";
        if (g) at = g[1] + 1;
        if (name === "end") {
          if (LISTS.has(env)) closeList();
        } else if (LISTS.has(env)) {
          closeList();
          list = { ordered: env === "enumerate", items: [] };
        } else if (DISPLAY.has(env) || SKIPPED.has(env)) {
          const closer = `\\end{${g ? s.slice(g[0], g[1]) : env}}`;
          const end = findWithin(closer, at, s.length);
          if (end >= 0) {
            if (DISPLAY.has(env) && end - at <= DISPLAY_MATH_CAP) {
              const tex = s.slice(at, end).replace(/\\label\{[^}]*\}/g, "").trim();
              block({ k: "math", tex: ALIGNED.has(env) ? `\\begin{aligned}${tex}\\end{aligned}` : tex });
            }
            at = end + closer.length;
          }
        }
      } else if (name === "item") {
        at = optional(at);
        if (list) {
          flush();
          list.items.push([]);
        }
      } else if (name === "includegraphics") {
        const g = arg();
        if (g) block({ k: "figure", name: s.slice(g[0], g[1]).trim().split("/").pop() ?? "" });
      } else if (name === "input" || name === "include") {
        const g = arg();
        if (g) {
          const path = s.slice(g[0], g[1]).trim();
          if (path.includes("tables/")) block({ k: "table", path });
        }
      } else if (name === "href") {
        const url = arg();
        const label = arg();
        if (url) {
          flushText();
          inline.push({ t: "link", url: s.slice(url[0], url[1]).trim(), v: label ? plain(s, label[0], label[1]) : s.slice(url[0], url[1]).trim() });
        }
      } else if (name === "url") {
        const g = arg();
        if (g) {
          flushText();
          inline.push({ t: "link", url: s.slice(g[0], g[1]).trim(), v: s.slice(g[0], g[1]).trim() });
        }
      } else if (name in STYLED) {
        const g = arg();
        if (g) {
          flushText();
          inline.push({ t: STYLED[name], v: plain(s, g[0], g[1]) });
        }
      } else if (CITES.has(name)) {
        const g = arg();
        if (g) text += `[${s.slice(g[0], g[1]).trim()}]`;
      } else if (REFS.has(name)) {
        arg();
        text += "the reference";
      } else if (name === "caption" || name === "footnote") {
        const g = arg();
        if (g) text += name === "footnote" ? ` (${plain(s, g[0], g[1])})` : plain(s, g[0], g[1]);
      } else if (KEYED.has(name)) {
        arg();
      } else if (DROP_ARGS.has(name)) {
        while (arg()) continue;
      } else {
        at = optional(at);
        if (name === "par") flush();
      }
      i = at;
    }
  }
  if (list) closeList();
  else flush();
  return { blocks: blocks.slice(0, BLOCK_CAP), truncated };
}
