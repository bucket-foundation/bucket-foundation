import katex from "katex";
import { splitMath, texToText } from "@/lib/research-os/work-quiz/math";

function render(tex: string, display: boolean): string | null {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "htmlAndMathml" });
  } catch {
    return null;
  }
}

export function InlineMath({ text }: { text: string }) {
  const parts = splitMath(text);
  if (!parts.some((p) => p.kind === "math")) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "text") return <span key={i}>{p.value}</span>;
        const html = render(p.value, p.display);
        if (html === null) return <span key={i}>{texToText(p.value)}</span>;
        return <span key={i} className={p.display ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </>
  );
}
