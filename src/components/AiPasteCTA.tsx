"use client";

import { useState, useCallback } from "react";

const PROMPT = `Use www.bucket.foundation to research mitochondrial ATP synthesis. Follow the feed402 protocol described at /llms.txt, pay the x402 challenge from receipt.challenge, and cite the returned envelope.`;

/** URL-encoded for deep-link into Claude web. */
const CLAUDE_URL = `https://claude.ai/new?q=${encodeURIComponent(PROMPT)}`;
const CHATGPT_URL = `https://chatgpt.com/?q=${encodeURIComponent(PROMPT)}`;

export default function AiPasteCTA() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: select + copy via execCommand
      const ta = document.createElement("textarea");
      ta.value = PROMPT;
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
  }, []);

  return (
    <section className="stone-bone relative border-t-4 border-[color:var(--gold)] grain">
      <div className="max-w-[1400px] mx-auto px-6 py-20 md:py-24 grid grid-cols-12 gap-8 md:gap-10 items-start">
        {/* ─────────── left column ─────────── */}
        <div className="col-span-12 md:col-span-4">
          <div className="small-caps text-[10px] text-[color:var(--gold-deep)] tracking-[0.2em]">
            § I · b · AI-native
          </div>
          <h2 className="mt-6 font-display uppercase text-[clamp(1.6rem,3.2vw,2.4rem)] leading-[1.08] text-[color:var(--basalt)]">
            paste into Claude.
            <span className="block ed-italic text-[color:var(--aegean-deep)] font-light mt-1">
              the rest is automatic.
            </span>
          </h2>
          <p className="mt-5 text-[15px] leading-[1.7] text-[color:var(--basalt-2)] max-w-sm">
            Drop{" "}
            <span className="font-mono-mark text-[color:var(--aegean-deep)]">
              www.bucket.foundation
            </span>{" "}
            into any agent — Claude, ChatGPT, Perplexity. They auto-discover
            the research API via{" "}
            <a
              href="/llms.txt"
              className="font-mono-mark underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--aegean-deep)]"
            >
              /llms.txt
            </a>
            , find the feed402 manifest, and pay{" "}
            <span className="font-mono-mark text-[color:var(--gold-deep)]">$0.005</span>{" "}
            per query on Base — with the citation paying the author, forever.
          </p>
        </div>

        {/* ─────────── right column: prompt + actions ─────────── */}
        <div className="col-span-12 md:col-span-8">
          <div className="carved-inset rounded-sm bg-[color:var(--bone-2)]/70 p-5 md:p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="small-caps text-[9px] text-[color:var(--aegean-deep)] tracking-[0.22em]">
                › claude prompt
              </span>
              <span className="font-mono-mark text-[9px] text-[color:var(--gold-deep)]">
                feed402 / 0.2
              </span>
            </div>

            {/* prompt body — selectable, non-wrapped monospace */}
            <div
              onClick={handleCopy}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCopy();
                }
              }}
              className="cursor-pointer font-mono-mark text-[13px] md:text-[14px] leading-[1.7] text-[color:var(--basalt)] whitespace-pre-wrap break-words select-all transition hover:bg-[color:var(--bone)]/60 rounded-[2px] p-2 -m-2"
              aria-label="Click to copy Claude prompt"
            >
              <span className="text-[color:var(--gold-deep)]">$ </span>
              {PROMPT}
            </div>

            {/* action row — real buttons */}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 small-caps text-[11px] tracking-[0.14em] text-[color:var(--bone)] bg-[color:var(--basalt)] px-5 py-3 rounded-sm min-h-[44px] shadow-[0_1px_0_rgba(239,232,212,0.35)_inset,0_2px_6px_rgba(31,28,22,0.25)] hover:bg-[color:var(--aegean-deep)] transition"
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <span className="text-[color:var(--gold)]">✓</span> copied
                  </>
                ) : (
                  <>
                    <span className="text-[color:var(--gold)]">⧉</span> copy prompt
                  </>
                )}
              </button>
              <a
                href={CLAUDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 small-caps text-[11px] tracking-[0.14em] text-[color:var(--bone)] bg-[color:var(--laurel-deep)] px-5 py-3 rounded-sm min-h-[44px] shadow-[0_1px_0_rgba(239,232,212,0.35)_inset,0_2px_6px_rgba(31,28,22,0.25)] hover:bg-[color:var(--aegean-deep)] transition"
              >
                → open in Claude
              </a>
              <a
                href={CHATGPT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt)] bg-[color:var(--bone)] border border-[color:var(--hairline)] px-5 py-3 rounded-sm min-h-[44px] hover:border-[color:var(--gold)] transition"
              >
                → open in ChatGPT
              </a>
            </div>
          </div>

          {/* "what happens" 3-step timeline */}
          <ol className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-2)]">
            <li className="flex items-start gap-3 bg-[color:var(--bone)] border border-[color:var(--hairline)] p-4 rounded-sm shadow-[inset_0_1px_0_rgba(239,232,212,0.5)]">
              <span className="font-display text-[color:var(--gold-deep)] text-[14px] leading-none mt-[2px]">
                I
              </span>
              <span>
                <span className="block text-[color:var(--basalt)]">agent fetches /llms.txt</span>
                <span className="block text-[9px] text-[color:var(--basalt-3)] mt-1 normal-case tracking-normal font-mono-mark">
                  learns the protocol + API shape
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3 bg-[color:var(--bone)] border border-[color:var(--hairline)] p-4 rounded-sm shadow-[inset_0_1px_0_rgba(239,232,212,0.5)]">
              <span className="font-display text-[color:var(--gold-deep)] text-[14px] leading-none mt-[2px]">
                II
              </span>
              <span>
                <span className="block text-[color:var(--basalt)]">calls /api/research</span>
                <span className="block text-[9px] text-[color:var(--basalt-3)] mt-1 normal-case tracking-normal font-mono-mark">
                  gets x402 challenge · $0.005 on Base
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3 bg-[color:var(--bone)] border border-[color:var(--hairline)] p-4 rounded-sm shadow-[inset_0_1px_0_rgba(239,232,212,0.5)]">
              <span className="font-display text-[color:var(--gold-deep)] text-[14px] leading-none mt-[2px]">
                III
              </span>
              <span>
                <span className="block text-[color:var(--basalt)]">returns cited envelope</span>
                <span className="block text-[9px] text-[color:var(--basalt-3)] mt-1 normal-case tracking-normal font-mono-mark">
                  data + citation + on-chain receipt
                </span>
              </span>
            </li>
          </ol>

          {/* secondary CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            <a
              href="/build"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              → build your own agent
            </a>
            <span className="text-[color:var(--hairline-ink)]">·</span>
            <a
              href="https://github.com/bucket-foundation/bucket-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              bucket MCP for Claude Desktop
            </a>
            <span className="text-[color:var(--hairline-ink)]">·</span>
            <a
              href="/.well-known/feed402.json"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              feed402.json
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
