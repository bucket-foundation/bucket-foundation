"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { Atom } from "@/lib/academy/engine";

const DEPTHS: { key: string; label: string }[] = [
  { key: "eli5", label: "Plain" },
  { key: "core", label: "Core" },
  { key: "deep", label: "Deep" },
];

function depthText(atom: Atom, key: string): string {
  const d = atom.depths;
  if (d && !Array.isArray(d) && typeof d[key] === "string") return d[key];
  return atom.summary ?? "";
}

export function Equation({ tex }: { tex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: false });
    } catch {
      return "";
    }
  }, [tex]);
  if (!html) return <pre className="font-mono text-[13px] overflow-x-auto">{tex}</pre>;
  return <div className="overflow-x-auto py-2" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** One atom's teaching text: the three depths, the full lesson, the note, sources, and resources. */
export default function Lesson({ atom, full = true }: { atom: Atom; full?: boolean }) {
  const [depth, setDepth] = useState("core");
  const hasDepths = atom.depths && !Array.isArray(atom.depths);

  return (
    <article className="max-w-[68ch]">
      {atom.summary && <p className="text-[15px] leading-[1.7] text-[color:var(--basalt)]">{atom.summary}</p>}

      {hasDepths && (
        <div className="mt-4">
          <div role="tablist" aria-label="Depth" className="flex gap-1 border-b border-[color:var(--hairline)]">
            {DEPTHS.map((d) => (
              <button
                key={d.key}
                role="tab"
                aria-selected={depth === d.key}
                onClick={() => setDepth(d.key)}
                className={
                  "small-caps text-[10px] tracking-[0.18em] px-3 py-2 border-b-2 -mb-px min-h-[40px] " +
                  (depth === d.key ? "border-[color:var(--gold)] text-[color:var(--basalt)]" : "border-transparent text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="pt-3 text-[14px] leading-[1.75] text-[color:var(--basalt-2)]">
            <p>{depthText(atom, depth)}</p>
            {depth === "deep" && atom.equation && <Equation tex={atom.equation} />}
            {depth === "deep" && atom.note && <p className="mt-2 text-[13px] text-[color:var(--basalt-3)]">{atom.note}</p>}
          </div>
        </div>
      )}

      {full && atom.lesson && (
        <div className="lesson-prose mt-6 text-[14px] leading-[1.75] text-[color:var(--basalt-2)]">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
            {atom.lesson}
          </ReactMarkdown>
        </div>
      )}

      {(atom.sources?.length || atom.resources?.length) && (
        <footer className="mt-6 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">
          {atom.sources?.length ? <div>Learn from: {atom.sources.join(" · ")}</div> : null}
          {atom.resources?.length ? (
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {atom.resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-[color:var(--basalt)]">
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </footer>
      )}
    </article>
  );
}
