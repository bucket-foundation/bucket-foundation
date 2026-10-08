import Link from "next/link";
import { HEADLINES, MODULES, PROOF, modulesByVerb, type Module, type Variant } from "@/lib/research-os/home-variants";
import "./home-variant.css";

function Tile({ m, i }: { m: Module; i: number }) {
  return (
    <Link href={m.route} className="hv-tile">
      <span className="hv-tile-num">{String(i + 1).padStart(2, "0")}</span>
      <span className="hv-tile-label">
        {m.label}
        {m.where === "desktop" ? <span className="hv-tile-tag">desktop</span> : null}
      </span>
      <span className="hv-tile-line">{m.line}</span>
    </Link>
  );
}

function Modules({ v }: { v: Variant }) {
  if (v.grouping === "verb") {
    return (
      <>
        <div className="hv-groups">
          {modulesByVerb().map((g) => (
            <section key={g.verb} className="hv-group">
              <h2 className="hv-group-title">{g.verb}</h2>
              <div className={`hv-${v.layout} hv-in-group`}>
                {g.modules.map((m) => (
                  <Tile key={m.label} m={m} i={MODULES.indexOf(m)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </>
    );
  }
  return (
    <div className={`hv-${v.layout}`}>
      {MODULES.map((m, i) => (
        <Tile key={m.label} m={m} i={i} />
      ))}
    </div>
  );
}

export default function HomeVariant({ v }: { v: Variant }) {
  const h = HEADLINES[v.headline];
  const open = (
    <Link className="hv-btn" href="/research-os/home">
      Open Research OS →
    </Link>
  );
  const download = (
    <Link className="hv-btn hv-btn-quiet" href="/download">
      Download for your computer →
    </Link>
  );
  return (
    <main className={`hv hv-pal-${v.palette} hv-type-${v.type}`} data-variant={v.id}>
      <header className="hv-hero">
        <h1 className="hv-title">{h.title}</h1>
        <p className="hv-sub">{h.sub}</p>
        <div className="hv-cta">
          {v.cta === "open" ? open : download}
          {v.cta === "open" ? download : open}
        </div>
        <p className="hv-proof">{PROOF[v.proof]}</p>
      </header>
      <Modules v={v} />
      <footer className="hv-foot">
        <span>{MODULES.length} modules. Tiles marked desktop open in the app you download; the rest open on the web.</span>
        <Link href="/research-os/workspace">Try it in the workspace →</Link>
      </footer>
    </main>
  );
}
