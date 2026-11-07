import type { Metadata } from "next";
import { Brand } from "../parts";
import styles from "../stoa.module.css";

export const metadata: Metadata = {
  title: "Student data in Polingual Live",
  description: "What a player leaves behind in a Polingual Live room, and when it is deleted.",
  alternates: { canonical: "/live/student-data" },
};

export default function StudentDataPage() {
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Brand />
      </header>
      <main className={styles.main}>
        <article className={`${styles.card} ${styles.doc}`} data-testid="student-data">
          <p className={styles.label}>Polingual Live</p>
          <h1 className={styles.title}>Student data</h1>
          <p className={styles.body}>Players join a live room on their phones with a room code. They make no account and we collect no personal information about them.</p>

          <h2>What a player gives us</h2>
          <ul>
            <li>The 6 character room code from the board.</li>
            <li>A nickname picked from three we generate, such as Brave Otter. Players cannot type a name.</li>
            <li>Their answers and the time each answer reached us.</li>
          </ul>
          <p>Players give no email, real name, photo, contact or location. The game has no chat and no place to type text.</p>

          <h2>What we keep and for how long</h2>
          <ul>
            <li>The nickname, answers and points sit under a random player id that exists only inside that room.</li>
            <li>The phone holds a room token that stops working when the room closes. Every room closes within 3 hours.</li>
            <li>We delete every room, player, answer and score record 24 hours after the room closes.</li>
            <li>To stop code guessing and floods we count requests per network. These counters hold a hashed address for about two minutes.</li>
            <li>When phones report forged traffic, each report carries a key hashed from the room and the network. It is deleted with the room.</li>
            <li>Our hosting providers, Vercel and Supabase, keep standard request logs with IP addresses under their own retention.</li>
          </ul>
          <p>After the 24 hours the host keeps a summary with no player rows: the player count, the share of right answers per question and the top nicknames.</p>

          <h2>Children under 13</h2>
          <p>Live rooms collect no personal information from players: no name, contact, photo, location or lasting identifier. Students under 13 can play in a class without parental consent because nothing about them is collected.</p>

          <h2>Schools</h2>
          <p>We receive no student names or education records. The teacher can download a results file that pairs nicknames with scores. Only the teacher knows which student held which nickname, and the file is the teacher&rsquo;s record, kept wherever the teacher saves it.</p>
          <p>In School mode, player screens and the board show no app links, promotions or store buttons.</p>

          <h2>Questions</h2>
          <p>
            Write to <a href="mailto:support@polingual.com">support@polingual.com</a>. Hosts agree to the <a href="/live/terms">host terms</a>.
          </p>
        </article>
      </main>
    </div>
  );
}
