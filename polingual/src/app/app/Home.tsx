"use client";

import styles from "./app.module.css";

export default function Home() {
  return (
    <section className={styles.card} data-testid="app-home">
      <p className={styles.label}>Signed in</p>
      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.body}>Your languages load here.</p>
    </section>
  );
}
