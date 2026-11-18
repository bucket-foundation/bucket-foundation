import type { Metadata } from "next";
import Link from "next/link";
import Legal from "@/app/legal";
import { GUIDES } from "@/lib/guides";
import { pageMeta } from "@/lib/meta";

export const metadata: Metadata = pageMeta({ path: "/learn", title: "Polingual guides", documentTitle: "Guides | Polingual", description: "Short guides to studying several languages at once with Polingual, in English and Spanish." });

export default function Page() {
  return (
    <Legal>
      <h1>Guides</h1>
      <p className="lede">Short reads on studying several languages at once.</p>
      {GUIDES.map((g) => (
        <section key={g.slug} lang={g.lang}>
          <h2><Link href={`/learn/${g.slug}`}>{g.title}</Link></h2>
          <p>{g.description}</p>
        </section>
      ))}
    </Legal>
  );
}
