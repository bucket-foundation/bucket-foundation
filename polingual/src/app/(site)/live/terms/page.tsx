import type { Metadata } from "next";
import { Brand } from "../parts";
import styles from "../stoa.module.css";

export const metadata: Metadata = {
  title: "Host terms for Polingual Live",
  description: "What a host agrees to before opening a Polingual Live room.",
  alternates: { canonical: "/live/terms" },
};

export default function HostTermsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Brand />
      </header>
      <main className={styles.main}>
        <article className={`${styles.card} ${styles.doc}`} data-testid="host-terms-page">
          <p className={styles.label}>Polingual Live</p>
          <h1 className={styles.title}>Host terms</h1>
          <p className={styles.body}>You accept these terms with a checkbox before you open your first room. The acceptance is saved in that browser only: we keep no record on our servers of who accepted or when, and a new browser asks again.</p>

          <h2>Who hosts</h2>
          <ul>
            <li>You are a teacher, a parent or another adult.</li>
            <li>If you host for a school, the school allows you to use this tool with your class.</li>
          </ul>

          <h2>Running a room</h2>
          <ul>
            <li>Share the room code and the board with the players you invite.</li>
            <li>Lock the room once your class is in, and remove any player who disrupts the game.</li>
            <li>Turn on School mode for a class. It removes app links and promotions from every screen.</li>
          </ul>

          <h2>Results</h2>
          <ul>
            <li>The results file pairs nicknames with scores. Keep it private.</li>
            <li>Keep any list of which student held which nickname to yourself, and delete it when you no longer need it.</li>
          </ul>

          <h2>Student data</h2>
          <p>
            Players give no personal information, and we delete room records 24 hours after a room closes. The <a href="/live/student-data">student data page</a> has the details.
          </p>

          <h2>Price and changes</h2>
          <p>Hosting and joining are free. We may close rooms that break these terms. We will post any change to these terms on this page. The <a href="/terms">Polingual Terms of Use</a> also apply.</p>

          <p>
            Questions: <a href="mailto:support@polingual.com">support@polingual.com</a>
          </p>
        </article>
      </main>
    </div>
  );
}
