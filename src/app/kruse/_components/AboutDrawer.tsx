"use client";

import { useEffect, useState } from "react";

export default function AboutDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs uppercase tracking-wider underline underline-offset-4 transition hover:opacity-80"
        style={{ color: "#8a867c", fontFamily: "var(--font-jetbrains)" }}
      >
        How this works
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex justify-end"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="relative h-full w-full max-w-md overflow-y-auto border-l px-7 py-10 md:px-9"
            style={{ backgroundColor: "#0b0d0f", borderColor: "#1c1f22" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 text-xs uppercase tracking-wider"
              style={{ color: "#8a867c", fontFamily: "var(--font-jetbrains)" }}
              aria-label="Close"
            >
              Close
            </button>

            <h2
              className="mb-5 text-2xl"
              style={{ fontFamily: "var(--font-fraunces)", color: "#ece7dd" }}
            >
              How the Index works
            </h2>

            <div
              className="space-y-5 text-sm leading-relaxed"
              style={{ color: "#bdb7ac", fontFamily: "var(--font-fraunces)" }}
            >
              <p>
                The Kruse Index searches 460 public articles from jackkruse.com using
                three different retrieval methods. You can pick one, or combine them.
              </p>

              <div>
                <h3
                  className="mb-1 text-xs uppercase tracking-[0.2em]"
                  style={{ color: "#d9c48c", fontFamily: "var(--font-jetbrains)" }}
                >
                  Keyword (BM25 / FTS5)
                </h3>
                <p>
                  Finds articles where your exact words appear, ranked by how often
                  and how distinctively. Great for known terms: compound names,
                  titles, specific phrases.
                </p>
              </div>

              <div>
                <h3
                  className="mb-1 text-xs uppercase tracking-[0.2em]"
                  style={{ color: "#b7c9d9", fontFamily: "var(--font-jetbrains)" }}
                >
                  Semantic (MiniLM-L6-v2)
                </h3>
                <p>
                  Each article is converted into a 384-dimensional vector that
                  captures meaning rather than surface words. Your query becomes
                  a vector too, and the index returns the articles closest to it
                  in meaning. &quot;Why do I wake up at 3am&quot; finds pieces on
                  nocturnal cortisol even when the exact phrase isn&apos;t there.
                </p>
              </div>

              <div>
                <h3
                  className="mb-1 text-xs uppercase tracking-[0.2em]"
                  style={{ color: "#cdb8d9", fontFamily: "var(--font-jetbrains)" }}
                >
                  Hybrid (RRF, k=60)
                </h3>
                <p>
                  Reciprocal Rank Fusion blends the two rankings. If an article is
                  near the top of both, it wins. This is the default, and in
                  practice it&apos;s the most forgiving: the exact-word strength
                  of keyword plus the meaning-recall of semantic.
                </p>
              </div>

              <p
                className="pt-2 text-xs"
                style={{ color: "#7a7669", fontFamily: "var(--font-jetbrains)" }}
              >
                All compute runs on-device on the Bucket Foundation server.
                No queries are logged or shared.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
