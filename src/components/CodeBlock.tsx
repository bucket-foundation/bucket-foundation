"use client";

import { useState, useCallback } from "react";

export type CodeBlockProps = {
  code: string;
  lang?: string;       // displayed label (e.g. "bash", "ts", "json")
  title?: string;      // small caption above the block
  lines?: boolean;     // show line numbers (default true)
};

export default function CodeBlock({
  code,
  lang = "bash",
  title,
  lines = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  }, [code]);

  const rows = code.replace(/\n$/, "").split("\n");

  return (
    <div className="group relative mt-4 bg-[#1F1C16] rounded-sm overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[color:rgba(239,232,212,0.08)] bg-[rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3 min-w-0">
          {/* traffic-light dots */}
          <span className="flex gap-[5px] shrink-0" aria-hidden>
            <span className="w-[9px] h-[9px] rounded-full bg-[#E06C4C]/70" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#D9A43A]/70" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#6EA87C]/70" />
          </span>
          {title && (
            <span className="font-mono-mark text-[10px] text-[color:var(--bone-3)]/70 truncate">
              {title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="small-caps text-[9px] tracking-[0.18em] text-[color:var(--gold)]/70">
            {lang}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 small-caps text-[9px] tracking-[0.18em] text-[color:var(--bone-3)]/80 hover:text-[color:var(--gold)] transition px-2 py-1 rounded-[2px] focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold)]"
            aria-live="polite"
            aria-label={copied ? "Copied" : "Copy to clipboard"}
          >
            {copied ? (
              <>
                <span className="text-[color:var(--gold)]">✓</span> copied
              </>
            ) : (
              <>
                <span>⧉</span> copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <pre className="text-[12px] md:text-[12.5px] leading-[1.65] font-mono-mark overflow-x-auto p-4 text-[color:var(--bone-2)]">
        <code className="grid">
          {rows.map((row, i) => (
            <span key={i} className="flex">
              {lines && (
                <span
                  aria-hidden
                  className="select-none pr-4 text-right text-[color:var(--bone-3)]/25 w-8 shrink-0 tabular-nums"
                >
                  {i + 1}
                </span>
              )}
              <span className="whitespace-pre">{row || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
