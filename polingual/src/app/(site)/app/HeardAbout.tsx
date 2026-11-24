"use client";

import { useEffect, useState } from "react";
import { HEARD_ABOUT, type HeardAbout as Answer } from "@/lib/funnel-steps";
import { heardAboutDue, HEARD_KEY, HEARD_LABELS } from "@/lib/heard-about";
import { onboarding, track } from "@/lib/funnel";
import { local } from "@/lib/storage";
import styles from "./app.module.css";
import { Button, Card, Stage } from "@/ui";

export default function HeardAbout({ children }: { children: React.ReactNode }) {
  const [due, setDue] = useState<boolean | null>(null);
  useEffect(() => {
    const show = heardAboutDue(local());
    setDue(show);
    onboarding(show ? "heard_about" : "languages");
  }, []);
  function answer(a: Answer) {
    try {
      local()?.setItem(HEARD_KEY, a);
    } catch {
    }
    track("heard_about", undefined, a);
    onboarding("languages");
    setDue(false);
  }
  if (due === null) return null;
  if (!due) return <>{children}</>;
  return (
    <Stage ground="paper">
      <Card as="section" className={styles.card} data-testid="heard-about">
        <h1 className={styles.title}>How did you hear about Polingual?</h1>
        <div className={styles.row}>
          {HEARD_ABOUT.map((a) => (
            <Button key={a} variant="secondary" size="sm" onClick={() => answer(a)} data-testid={`heard-${a}`}>
              {HEARD_LABELS[a]}
            </Button>
          ))}
        </div>
      </Card>
    </Stage>
  );
}
