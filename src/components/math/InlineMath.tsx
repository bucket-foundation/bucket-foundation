"use client";

import { useCallback, useSyncExternalStore } from "react";
import katex from "katex";
import { splitMath, texToText } from "@/lib/research-os/work-quiz/math";

const OPTIONS = { throwOnError: false, output: "htmlAndMathml", trust: false, strict: "ignore", maxExpand: 1000 } as const;
const never = () => () => {};

function markup(tex: string, display: boolean): string | null {
  try {
    return katex.renderToString(tex, { ...OPTIONS, displayMode: display });
  } catch {
    return null;
  }
}

export function Tex({ tex, display }: { tex: string; display: boolean }) {
  const hydrating = useSyncExternalStore(never, () => false, () => true);
  const mount = useCallback(
    (el: HTMLSpanElement | null) => {
      if (!el) return;
      try {
        katex.render(tex, el, { ...OPTIONS, displayMode: display });
      } catch {
        el.textContent = texToText(tex);
      }
    },
    [tex, display],
  );
  const className = display ? "math-display" : "math-inline";
  if (!hydrating) return <span key="dom" className={className} ref={mount} />;
  const html = markup(tex, display);
  if (html === null) return <span key="text">{texToText(tex)}</span>;
  return <span key="markup" className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function InlineMath({ text }: { text: string }) {
  const parts = splitMath(text);
  if (!parts.some((p) => p.kind === "math")) return <>{text}</>;
  return <>{parts.map((p, i) => (p.kind === "text" ? <span key={i}>{p.value}</span> : <Tex key={i} tex={p.value} display={p.display} />))}</>;
}
