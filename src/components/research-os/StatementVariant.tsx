import Image from "next/image";
import Link from "next/link";
import { DIRECTIONS, FIGURE, GOAL, QUESTION, type Direction, type StatementVariant as SV } from "@/lib/research-os/statement-variants";
import "./statement-variant.css";

function Block({ d }: { d: Direction }) {
  return (
    <section className="sv-dir">
      <div className="sv-dir-num">{d.num}</div>
      <h2 className="sv-dir-title">{d.title}</h2>
      <p className="sv-dir-claim">{d.claim}</p>
      <ul className="sv-dir-facts">
        {d.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Link href={d.link.href}>{d.link.label} →</Link>
    </section>
  );
}

function Figure() {
  return (
    <figure className="sv-figure">
      <Image src={FIGURE.src} alt={FIGURE.alt} width={1200} height={1200} sizes="(min-width: 900px) 40vw, 100vw" priority />
      <figcaption>{FIGURE.caption}</figcaption>
    </figure>
  );
}

export default function StatementVariant({ v }: { v: SV }) {
  const dirs = DIRECTIONS.map((d) => <Block key={d.num} d={d} />);
  return (
    <main className={`sv sv-pal-${v.palette} sv-type-${v.type} sv-${v.layout}`} data-variant={v.id}>
      <header className="sv-head">
        <p className="sv-kicker">Research statement · Gianangelo Dichio</p>
        <h1 className="sv-question">{QUESTION}</h1>
        <p className="sv-goal">{GOAL}</p>
      </header>
      <div className="sv-body">
        {v.figureFirst ? <Figure /> : null}
        <div className="sv-dirs">{dirs}</div>
        {v.figureFirst ? null : <Figure />}
      </div>
      <footer className="sv-foot">
        <span>Every number traces to a file and a command in the paper.</span>
        <Link href="/research">Bucket research →</Link>
      </footer>
    </main>
  );
}
