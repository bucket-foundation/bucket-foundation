import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PLAN_DOCS, plansEnabled } from "../docs";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function PlanDoc({ params }: { params: Promise<{ slug: string }> }) {
  if (!plansEnabled()) notFound();
  const { slug } = await params;
  const doc = PLAN_DOCS.find((d) => d.slug === slug);
  if (!doc) notFound();
  const text = await readFile(path.join(process.cwd(), doc.file), "utf8");
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link className="text-sm underline" href="/internal/plans">
        All plans
      </Link>
      <article className="plan-doc mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </article>
      <style>{`
        .plan-doc h1{font-size:2rem;font-weight:600;margin:0 0 1rem}
        .plan-doc h2{font-size:1.5rem;font-weight:600;margin:2.5rem 0 .75rem}
        .plan-doc h3{font-size:1.15rem;font-weight:600;margin:1.75rem 0 .5rem}
        .plan-doc p,.plan-doc li{line-height:1.65;margin:.5rem 0}
        .plan-doc ul{list-style:disc;padding-left:1.5rem}
        .plan-doc ol{list-style:decimal;padding-left:1.5rem}
        .plan-doc a{text-decoration:underline}
        .plan-doc code{font-size:.9em;padding:.1em .3em;border-radius:4px;background:rgba(127,127,127,.15)}
        .plan-doc table{display:block;overflow-x:auto;border-collapse:collapse;margin:1rem 0;font-size:.92rem}
        .plan-doc th,.plan-doc td{border:1px solid rgba(127,127,127,.35);padding:.45rem .6rem;vertical-align:top;text-align:left}
        .plan-doc th{background:rgba(127,127,127,.12)}
      `}</style>
    </main>
  );
}
