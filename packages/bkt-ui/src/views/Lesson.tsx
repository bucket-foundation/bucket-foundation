import type { ReactNode } from "react";

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\$[^$]+\$)/g;

export function inline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.length > 2 && part.startsWith("$") && part.endsWith("$")) return <span key={i} className="math">{part.slice(1, -1)}</span>;
    return part;
  });
}

type Block = { kind: "h"; text: string } | { kind: "ul"; items: string[] } | { kind: "p"; text: string };

export function blocks(text: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    if (list.length) out.push({ kind: "ul", items: list });
    para = [];
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) flush();
    else if (/^#{1,6}\s/.test(line)) {
      flush();
      out.push({ kind: "h", text: line.replace(/^#{1,6}\s+/, "") });
    } else if (/^[-*]\s+/.test(line)) {
      if (para.length) flush();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return out;
}

export function Lesson({ text }: { text: string }) {
  return (
    <div className="lesson">
      {blocks(text).map((b, i) =>
        b.kind === "h" ? (
          <Heading key={i} text={b.text} />
        ) : b.kind === "ul" ? (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.text)}</p>
        ),
      )}
    </div>
  );
}

function Heading({ text }: { text: string }) {
  const body = inline(text);
  return <h3>{body}</h3>;
}
