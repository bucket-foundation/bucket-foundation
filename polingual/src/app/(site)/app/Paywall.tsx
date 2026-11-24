"use client";

import { APP_STORE_URL, PLANS, type Access } from "@/lib/app/plans";
import {
  billingMessage,
  isAppleDevice,
  startCheckout,
  type WebPlan,
} from "@/lib/app/billing";
import { useEffect, useState } from "react";
import { track } from "@/lib/funnel";
import styles from "./app.module.css";
import { Button, ButtonLink, Stage } from "@/ui";

const WEB_PLANS: readonly string[] = ["monthly", "yearly"];

function PlanList({
  busy,
  buy,
}: {
  busy: WebPlan | null;
  buy: (plan: WebPlan) => Promise<void>;
}) {
  return (
    <ul className={styles.plans}>
      {PLANS.map((p) => {
        const web = WEB_PLANS.includes(p.id);
        return (
          <li
            key={p.id}
            className={styles.plan}
            data-testid="plan"
            data-available={web ? "yes" : "no"}
          >
            <span className={styles.planName}>{p.name}</span>
            <span className={styles.planPrice}>{p.price}</span>
            <span className={styles.small}>{p.cadence}</span>
            {web ? (
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => void buy(p.id as WebPlan)}
                data-testid={`checkout-${p.id}`}
              >
                {busy === p.id ? "Opening checkout" : "Try 3 days free"}
              </Button>
            ) : (
              <span className={styles.soon} data-testid="coming-soon">
                Coming soon
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Actions({ apple, retry }: { apple: boolean; retry: () => void }) {
  return (
    <div className={styles.row}>
      {apple ? (
        <ButtonLink variant="secondary" href={APP_STORE_URL} target="_blank" rel="noreferrer" data-testid="app-store-link">
          Subscribe in the app
        </ButtonLink>
      ) : null}
      <Button variant="quiet" size="sm" onDark onClick={retry} data-testid="recheck">
        I subscribed, check again
      </Button>
    </div>
  );
}

export default function Paywall({
  access,
  retry,
}: {
  access: Access;
  retry: () => void;
}) {
  useEffect(() => track("paywall_view"), []);
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<WebPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () =>
      setApple(isAppleDevice(navigator.userAgent, navigator.maxTouchPoints)),
    [],
  );

  async function buy(plan: WebPlan) {
    setBusy(plan);
    setError(null);
    const r = await startCheckout(plan);
    if (r.ok) {
      window.location.assign(r.url);
      return;
    }
    setBusy(null);
    setError(billingMessage(r.error));
  }

  return (
    <Stage ground="lattice">
      <section className={styles.stack} data-testid="paywall">
        <div>
          <p className={styles.label}>Polingual plans</p>
          <h1 className={styles.title}>Start your 3-day free trial</h1>
          <p className={styles.body}>
            One subscription opens Polingual on the web, iPhone and iPad. Pick a
            plan, pay nothing for 3 days, cancel any time before the trial ends.
          </p>
        </div>
        <PlanList busy={busy} buy={buy} />
        {error ? (
          <p role="alert" className={styles.error} data-testid="checkout-error">
            {error}
          </p>
        ) : null}
        <Actions apple={apple} retry={retry} />
        {access.status === "unknown" ? (
          <p className={styles.error} data-testid="access-unknown">
            Your subscription could not be checked. Try again in a minute.
          </p>
        ) : null}
        <p className={styles.small}>
          Web plans bill through Stripe and renew until you cancel from your
          account page. App plans renew through Apple.
        </p>
      </section>
    </Stage>
  );
}
