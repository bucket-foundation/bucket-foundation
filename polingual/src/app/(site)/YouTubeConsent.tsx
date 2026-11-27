"use client";

import { Button } from "@/ui";
import { browserStore, forgetConsent, rememberConsent } from "@/lib/app/embed-consent";
import app from "./app/app.module.css";

export function YouTubeConsent({ onAnswer, className, declineText = "Read without video" }: { onAnswer: (allow: boolean) => void; className?: string; declineText?: string }) {
  const allow = () => {
    rememberConsent(browserStore());
    onAnswer(true);
  };
  return (
    <section className={className} role="region" aria-label="YouTube consent" data-testid="youtube-consent">
      <p className={app.small}>
        This clip plays from YouTube. Loading it sends your address and device details to Google, which may set cookies. <a href="/privacy">Privacy</a>
      </p>
      <div className={app.row}>
        <Button variant="ghost" size="md" onClick={allow} data-testid="youtube-allow">
          Allow YouTube videos
        </Button>
        <Button variant="ghost" size="md" onClick={() => onAnswer(false)} data-testid="youtube-decline">
          {declineText}
        </Button>
      </div>
    </section>
  );
}

export function StopYouTube({ onStop, className }: { onStop: () => void; className?: string }) {
  const stop = () => {
    forgetConsent(browserStore());
    onStop();
  };
  return (
    <button type="button" className={className} onClick={stop} data-testid="youtube-withdraw">
      Stop loading YouTube videos
    </button>
  );
}
