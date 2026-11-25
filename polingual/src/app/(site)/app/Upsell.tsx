"use client";

import { useEffect, useState } from "react";
import { PLANS, UPSELL_KEY, upsellDue, type Access } from "@/lib/app/plans";
import { startCheckout, type WebPlan } from "@/lib/app/billing";
import styles from "./app.module.css";
import { Button } from "@/ui";

const OFFERS = PLANS.filter((p) => p.id === "lifetime");

export default function Upsell({ access }: { access: Access }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(UPSELL_KEY) !== null;
    } catch {
      seen = true;
    }
    if (!upsellDue(window.location.search, access, seen)) return;
    try {
      localStorage.setItem(UPSELL_KEY, new Date().toISOString());
    } catch {
    }
    setShow(true);
  }, [access]);
  if (!show) return null;
  async function buy(plan: WebPlan) {
    setBusy(plan);
    const r = await startCheckout(plan);
    if (r.ok) window.location.assign(r.url);
    else setBusy(null);
  }
  return (
    <section className={styles.stack} data-testid="post-purchase-upsell">
      <p className={styles.label}>Your trial has started</p>
      <p className={styles.body}>Keeping Polingual for good? Switch to Lifetime now and your trial ends with no charge.</p>
      <ul className={styles.plans}>
        {OFFERS.map((p) => (
          <li key={p.id} className={styles.plan}>
            <span className={styles.planName}>{p.name}</span>
            <span className={styles.planPrice}>{p.price}</span>
            <span className={styles.small}>{p.note}</span>
            <Button size="sm" disabled={busy !== null} onClick={() => void buy(p.id as WebPlan)} data-testid={`upsell-${p.id}`}>
              {busy === p.id ? "Opening checkout" : `Switch to ${p.name}`}
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="quiet" size="sm" onClick={() => setShow(false)} data-testid="upsell-dismiss">
        Keep yearly
      </Button>
    </section>
  );
}
