import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import Site from "@/app/site";
import { Tile, Tiles } from "@/app/tile";
import styles from "@/app/site.module.css";
import { installHref, isRtl, langName, ogPath, sharePath, shareKind, shareView, type Params } from "@/lib/share";
import { ButtonLink, Card } from "@/ui";

type Props = { params: Promise<{ kind?: string[] }>; searchParams: Promise<Params> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const kind = shareKind((await params).kind?.[0]);
  const query = await searchParams;
  const view = shareView(kind, query);
  return pageMeta({
    path: sharePath(kind, query),
    title: view.title,
    documentTitle: `${view.title} · Polingual`,
    description: view.description,
    noindex: true,
    image: { url: ogPath(kind, query), width: 1200, height: 630, type: "image/png", alt: `${view.eyebrow}: ${view.title}` },
  });
}

export default async function SharePage({ params, searchParams }: Props) {
  const kind = shareKind((await params).kind?.[0]);
  const view = shareView(kind, await searchParams);
  return (
    <Site wide={view.forms.length > 0}>
      <p className={styles.eyebrow}>{view.eyebrow}</p>
      <h1>{view.title}</h1>
      {view.forms.length > 0 ? (
        <Tiles>
          {view.forms.map((f, i) => (
            <Tile key={`${f.lang}${i}`} lang={f.lang} code={f.lang} label={langName(f.lang)} word={f.form} rtl={isRtl(f.lang)} />
          ))}
        </Tiles>
      ) : (
        <p className="lede">{view.description}</p>
      )}
      {view.langs.length > 0 ? (
        <ul className={styles.chipsPlain}>
          {view.langs.map((l) => (
            <li key={l}>{langName(l)}</li>
          ))}
        </ul>
      ) : null}
      {view.code ? (
        <Card className={styles.card}>
          Invite code <strong className={styles.code}>{view.code}</strong>. Open this link on your iPhone after you install Polingual to join the group.
        </Card>
      ) : null}
      <div className={styles.ctaRow}>
        <ButtonLink href={installHref(kind)}>Get Polingual</ButtonLink>
        <ButtonLink variant="secondary" href="/word">Browse words</ButtonLink>
      </div>
      <p className="lede">Learn several languages at once on iPhone and iPad.</p>
    </Site>
  );
}
