"use client";

import { play } from "@/lib/speak";
import { Button } from "./Button";

export function ReadAloud({ text, lang, label = "Read aloud", onDark, testId }: { text: string; lang: string; label?: string; onDark?: boolean; testId?: string }) {
  return (
    <Button variant="secondary" size="sm" onDark={onDark} aria-label={`${label}: ${text}`} data-testid={testId ?? "read-aloud"} onClick={() => void play({ id: `read:${text}`, text, lang })}>
      {label}
    </Button>
  );
}
