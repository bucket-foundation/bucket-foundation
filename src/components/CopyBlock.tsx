"use client";

import { useState } from "react";

export default function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-stretch border border-[color:var(--hairline)] bg-[color:var(--basalt)] text-[color:var(--bone)]">
      <pre className="flex-1 min-w-0 overflow-x-auto px-4 py-3 text-[13px] leading-[1.6]" tabIndex={0} aria-label={label}>
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="px-4 min-h-[44px] border-l border-[color:var(--hairline-bone)] hover:bg-[color:var(--aegean-deep)] transition small-caps text-[11px] tracking-[0.14em]"
      >
        <span aria-live="polite">{copied ? "copied" : "copy"}</span>
      </button>
    </div>
  );
}
