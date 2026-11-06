"use client";

import type { StreakCard as Card } from "@/lib/app/streak";
import styles from "./app.module.css";

export default function StreakCard({ card }: { card: Card }) {
  const pct = Math.round((card.day / card.goal) * 100);
  return (
    <section className={styles.streak} data-testid="streak-card" aria-label="100-day streak">
      <div>
        <p className={styles.streakLabel}>100-day streak</p>
        <p className={styles.streakDay} data-testid="streak-day">{card.label}</p>
        <p className={styles.streakNote}>{card.complete ? "You made it to 100 days." : card.studiedToday ? "Today counts. See you tomorrow." : "Study today to keep the streak."}</p>
      </div>
      <div className={styles.streakBar} role="progressbar" aria-valuemin={0} aria-valuemax={card.goal} aria-valuenow={card.day} aria-label={card.label}>
        <div style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
