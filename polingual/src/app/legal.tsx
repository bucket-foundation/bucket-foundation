import Link from "next/link";
import styles from "./legal.module.css";

export default function Legal({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header>
        <Link className={styles.brand} href="/">
          Polingual
        </Link>
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>Polingual is published by AGFarms LLC. Word data from Wiktionary via kaikki.org, CC BY-SA.</footer>
    </div>
  );
}
