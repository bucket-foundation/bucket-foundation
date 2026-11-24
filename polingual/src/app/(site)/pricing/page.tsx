import type { Metadata } from "next";
import Site from "@/app/site";
import styles from "@/app/site.module.css";
import { pageMeta } from "@/lib/meta";
import { PLANS } from "@/lib/app/plans";
import { TRIAL_DAYS, perWeek } from "@/lib/app/trial";
import { ButtonLink, Card } from "@/ui";

export const metadata: Metadata = pageMeta({
  path: "/pricing",
  title: "Polingual Pricing",
  description: `Polingual plans: yearly with ${TRIAL_DAYS} days free, monthly, family for up to 6 people, and lifetime. Games and live rooms stay free.`,
});

export default function PricingPage() {
  return (
    <Site>
      <p className={styles.eyebrow}>Pricing</p>
      <h1>One subscription, every language</h1>
      <p>Games and live rooms are free. Lessons, courses and daily study come with a plan, on the web, iPhone and Android.</p>
      {PLANS.map((p) => (
        <Card key={p.id} data-testid="pricing-plan">
          <h2>{p.name}</h2>
          <p>
            <b>{p.price}</b> {p.cadence}
            {p.id === "yearly" ? ` (${perWeek(59.99)}), ${TRIAL_DAYS} days free` : ""}
          </p>
          {p.note && p.id !== "yearly" ? <p>{p.note}</p> : null}
          {p.productId ? null : <p>Coming soon</p>}
        </Card>
      ))}
      <ButtonLink href="/app" data-testid="pricing-start">Start {TRIAL_DAYS} days free</ButtonLink>
    </Site>
  );
}
