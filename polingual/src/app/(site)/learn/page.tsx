import type { Metadata } from "next";
import Link from "next/link";
import Legal from "@/app/legal";
import { GUIDES, LOCAL_GUIDES, guidePath } from "@/lib/guides";
import { COMPARE_INDEX } from "@/lib/compare";
import { pageMeta } from "@/lib/meta";
import { Card, Header } from "@/ui";
import styles from "./guide.module.css";

export const metadata: Metadata = pageMeta({ path: "/learn", title: "Polingual guides", documentTitle: "Guides | Polingual", description: "Short guides to studying several languages at once with Polingual, in English and Spanish." });

const ENTRIES = [
  ...[...GUIDES, ...LOCAL_GUIDES].map((g) => ({ key: g.slug, href: guidePath(g), title: g.title, body: g.description, lang: g.lang })),
  { key: "compare", href: "/compare", title: "Polingual next to other apps", body: COMPARE_INDEX.description, lang: undefined },
];

export default function Page() {
  return (
    <Legal>
      <Header eyebrow="Learn" title="Guides" lede="Short reads on studying several languages at once." />
      <ul className={styles.list}>
        {ENTRIES.map((e) => (
          <Card as="li" key={e.key} lang={e.lang} interactive className={styles.entry}>
            <h2 className={styles.entryTitle}><Link href={e.href}>{e.title}</Link></h2>
            <p className={styles.entryBody}>{e.body}</p>
          </Card>
        ))}
      </ul>
    </Legal>
  );
}
