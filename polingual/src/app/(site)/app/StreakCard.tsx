"use client";

import type { StreakCard as Card } from "@/lib/app/streak";
import styles from "./app.module.css";
import { Meter, Sheet } from "@/ui";
import { Art } from "@/ui/art";

export default function StreakCard({ card }: { card: Card }) {
  return (
    <Sheet tone="tyrian" className={styles.streak} data-testid="streak-card" aria-label="100-day streak">
      <div>
        <p className={styles.streakLabel}>100-day streak</p>
        <div className={styles.streakRow}>
          <Art name="streak-flame" size={40} />
          <p className={styles.streakDay} data-testid="streak-day">
            {card.label}
          </p>
        </div>
        <p className={styles.streakNote}>
          {card.complete ? "You made it to 100 days." : card.studiedToday ? "Today counts. See you tomorrow." : "Study today to keep the streak."}
        </p>
      </div>
      <Meter value={card.day} max={card.goal} label={card.label} onDark />
    </Sheet>
  );
}
