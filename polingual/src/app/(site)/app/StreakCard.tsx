"use client";

import type { StreakCard as Card } from "@/lib/app/streak";
import styles from "./app.module.css";
import { Meter, Sheet, StreakFlame } from "@/ui";

export default function StreakCard({ card }: { card: Card }) {
  return (
    <Sheet tone="tyrian" className={styles.streak} data-testid="streak-card" aria-label="100-day streak">
      <div>
        <StreakFlame days={card.day} caption="100-day streak" onDark />
        <p className={styles.streakDay} data-testid="streak-day">{card.label}</p>
        <p className={styles.streakNote}>{card.complete ? "You made it to 100 days." : card.studiedToday ? "Today counts. See you tomorrow." : "Study today to keep the streak."}</p>
      </div>
      <Meter value={card.day} max={card.goal} label={card.label} onDark />
    </Sheet>
  );
}
