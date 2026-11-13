"use client";

import { useEffect, useState } from "react";
import { ADS } from "@/lib/lobby/ads";
import app from "../app/app.module.css";
import styles from "./play.module.css";
import { Button } from "@/ui";

export const CONSENT_KEY = "polingual-web/ad-consent/v1";

function stored(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export default function Consent({ required }: { required: boolean }) {
  const [choice, setChoice] = useState<string | null | undefined>(undefined);
  useEffect(() => setChoice(stored()), []);

  if (!required || ADS.mode !== "placeholder" || choice !== null) return null;

  const pick = (value: "personalized" | "non-personalized") => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
    }
    setChoice(value);
  };

  return (
    <section className={styles.consent} role="region" aria-label="Ad consent" data-testid="consent">
      <p className={app.small}>
        Free games run on ads. We and our ad partners use cookies to show and measure them. Pick whether ads may be personalized. <a href="/privacy">Privacy</a>
      </p>
      <div className={app.row}>
        <Button variant="ghost" size="md" onClick={() => pick("personalized")} data-testid="consent-accept">Accept</Button>
        <Button variant="ghost" size="md" onClick={() => pick("non-personalized")} data-testid="consent-reject">Only necessary</Button>
      </div>
    </section>
  );
}
