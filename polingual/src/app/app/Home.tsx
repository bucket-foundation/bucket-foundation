"use client";

import Link from "next/link";
import { LANGS, langName } from "@academy/lang-systems";
import { appHref, levelText, nextToPlace } from "@/lib/app/systems";
import NewSystem from "./NewSystem";
import { useSystems } from "./useSystems";
import styles from "./app.module.css";

export default function Home() {
  const { state, create } = useSystems();
  if (state.status === "loading") return <p className={styles.muted} aria-busy="true">Loading your languages</p>;
  if (state.status === "error") return <p className={styles.error}>Your languages did not load. Reload the page to try again.</p>;
  if (state.systems.length === 0) return <NewSystem first create={create} />;
  return (
    <section className={styles.stack} data-testid="app-home">
      <div>
        <p className={styles.label}>Your language systems</p>
        <h1 className={styles.title}>Pick up where you left off</h1>
      </div>
      <ul className={styles.grid}>
        {state.systems.map((s) => {
          const toPlace = nextToPlace(s);
          return (
            <li key={s.id} className={styles.tile} data-testid="system-tile">
              <h2 className={styles.tileTitle}>{s.name}</h2>
              <p className={styles.small}>From {langName(s.root)}</p>
              <ul className={styles.chips} aria-label={`${s.name} languages`}>
                {s.targets.map((t) => (
                  <li key={t} lang={LANGS[t]?.bcp47} className={styles.chip}>
                    {langName(t)} <span className={styles.level}>{levelText(s, t)}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.row}>
                <Link className={styles.cta} href={appHref.study(s.id)}>
                  Start today
                </Link>
                {toPlace ? (
                  <Link className={styles.ghost} href={appHref.place(s.id, toPlace)}>
                    Place {langName(toPlace)}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <Link className={styles.link} href={appHref.create}>
        Add a language system
      </Link>
    </section>
  );
}
