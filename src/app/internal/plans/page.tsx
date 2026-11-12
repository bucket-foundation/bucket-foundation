import Link from "next/link";
import { notFound } from "next/navigation";
import { PLAN_DOCS, plansEnabled } from "./docs";

export const metadata = { title: "Plans", robots: { index: false } };

export default function PlansIndex() {
  if (!plansEnabled()) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Plans</h1>
      <ul className="mt-6 space-y-3">
        {PLAN_DOCS.map((d) => (
          <li key={d.slug}>
            <Link className="text-lg underline" href={`/internal/plans/${d.slug}`}>
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
