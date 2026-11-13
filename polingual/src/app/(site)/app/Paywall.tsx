"use client";

import { APP_STORE_URL, PLANS, TESTFLIGHT_URL, type Access } from "@/lib/app/plans";
import styles from "./app.module.css";
import { Button, ButtonLink, Stage } from "@/ui";

export default function Paywall({ access, retry }: { access: Access; retry: () => void }) {
  return (
    <Stage ground="lattice">
    <section className={styles.stack} data-testid="paywall">
      <div>
        <p className={styles.label}>Polingual plans</p>
        <h1 className={styles.title}>Subscribe in the app</h1>
        <p className={styles.body}>Web access comes with a Polingual subscription on the same account. Subscribe in the iPhone or iPad app, then sign in here with the same email.</p>
      </div>
      <ul className={styles.plans}>
        {PLANS.map((p) => (
          <li key={p.id} className={styles.plan} data-testid="plan" data-available={p.productId ? "yes" : "no"}>
            <span className={styles.planName}>{p.name}</span>
            <span className={styles.planPrice}>{p.price}</span>
            <span className={styles.small}>{p.cadence}</span>
            {p.productId ? (p.note ? <span className={styles.level}>{p.note}</span> : null) : <span className={styles.soon} data-testid="coming-soon">Coming soon</span>}
          </li>
        ))}
      </ul>
      <div className={styles.row}>
        <ButtonLink href={APP_STORE_URL} target="_blank" rel="noreferrer" data-testid="app-store-link">Subscribe in the app</ButtonLink>
        <ButtonLink variant="ghost" size="md" onDark href={TESTFLIGHT_URL} target="_blank" rel="noreferrer">Join the beta</ButtonLink>
        <Button variant="quiet" size="sm" onDark onClick={retry} data-testid="recheck">I subscribed, check again</Button>
      </div>
      {access.status === "unknown" ? <p className={styles.error} data-testid="access-unknown">Your subscription could not be checked. Try again in a minute.</p> : null}
      <p className={styles.small}>Web checkout is coming later. Plans renew through Apple until you cancel in your Apple account settings.</p>
    </section>
    </Stage>
  );
}
