import { Banner } from "@/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Legal from "@/app/legal";
import { appJsonLd, faqJsonLd, jsonLdScript } from "@/lib/facts";
import { GUIDES, guide } from "@/lib/guides";
import { pageMeta } from "@/lib/meta";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guide((await params).slug);
  if (!g) return {};
  const url = `/learn/${g.slug}`;
  return pageMeta({ path: url, title: g.title, documentTitle: `${g.title} | Polingual`, description: g.description, type: "article", locale: g.lang === "es" ? "es_US" : "en_US" });
}

export default async function Page({ params }: Props) {
  const g = guide((await params).slug);
  if (!g) notFound();
  const home = g.lang === "es" ? "/es" : "/";
  return (
    <Legal>
      <div lang={g.lang}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([appJsonLd(), faqJsonLd(g.faq)]) }} />
        <Banner testId="guide-banner">
          <h1>{g.title}</h1>
          <p className="lede">{g.lede}</p>
        </Banner>
        {g.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}
        <h2>{g.lang === "es" ? "Preguntas" : "Questions"}</h2>
        {g.faq.map((f) => (
          <section key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </section>
        ))}
        <p><a href={`${home}?utm_source=seo&utm_campaign=${g.slug}`}>{g.cta}</a></p>
      </div>
    </Legal>
  );
}
