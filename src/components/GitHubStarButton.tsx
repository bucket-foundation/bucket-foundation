"use client";

import { useEffect, useState } from "react";
import { formatStars, loadStars } from "@/lib/format-stars";

export const GITHUB_URL = "https://github.com/bucket-foundation/bucket-foundation";
const GITHUB_API_URL = "https://api.github.com/repos/bucket-foundation/bucket-foundation";

export default function GitHubStarButton() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadStars(GITHUB_API_URL, controller.signal).then((count) => {
      if (!controller.signal.aborted) setStars(count);
    });
    return () => controller.abort();
  }, []);

  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={stars === null ? "Bucket Foundation on GitHub" : `Bucket Foundation on GitHub, ${stars} ${stars === 1 ? "star" : "stars"}`}
      className="inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone-2)]/60 text-[color:var(--basalt)] text-[13px] font-medium whitespace-nowrap no-underline transition-colors duration-150 hover:border-[color:var(--ochre)] hover:bg-[color:var(--bone-3)]/60"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ochre)" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span className="hidden sm:inline text-[12px] text-[color:var(--stone-300)]">
        {stars === null ? "Star" : formatStars(stars)}
      </span>
    </a>
  );
}
