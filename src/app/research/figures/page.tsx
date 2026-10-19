import type { Metadata } from "next";
import { loadFigures, type Figure } from "@/lib/figures";

export const metadata: Metadata = {
  title: "Figures",
  description: "Every figure Bucket renders from its own scripts, with the data it reads, the script that drew it and the date it last ran.",
  alternates: { canonical: "/research/figures" },
};

const link = "underline decoration-[color:var(--hairline)] underline-offset-2 hover:text-[color:var(--basalt)]";

function ranOn(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function FigureCard({ f }: { f: Figure }) {
  const inputs = Object.entries(f.params).map(([k, v]) => `${k} ${v}`).join(", ");
  return (
    <li id={f.name} data-figure={f.name} data-state={f.image ? "rendered" : "waiting"} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 md:p-7">
      <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">{f.topic}</div>
      <h2 className="mt-2 font-display text-[19px] uppercase text-[color:var(--basalt)]">{f.name}</h2>
      <p className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt-2)]">{f.about}</p>
      {f.image ? (
        <a href={f.image.src} className="mt-5 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.image.src} width={f.image.width} height={f.image.height} alt={f.about} loading="lazy" className="h-auto w-full border border-[color:var(--hairline)]" />
        </a>
      ) : null}
      {f.image && f.imageCount > 1 ? <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">Shows 1 of {f.imageCount} images. Run the script for the rest.</p> : null}
      {f.image ? null : (
        <div data-waiting className="mt-5 border border-dashed border-[color:var(--hairline)] px-5 py-8 text-[14px] leading-[1.6] text-[color:var(--basalt-2)]">
          <div className="font-display uppercase text-[color:var(--basalt)]">Data not published yet</div>
          <p className="mt-2">This figure reads data that is not in the repository: {f.missing.join(", ")}.</p>
        </div>
      )}
      <dl className="mt-5 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-[13px] leading-[1.5] text-[color:var(--basalt-2)]">
        <dt className="small-caps">Data</dt>
        <dd className="break-words">
          {f.data.map((d, i) => (
            <span key={d.path}>
              {i > 0 && ", "}
              {d.url ? <a href={d.url} className={link}>{d.path}</a> : <span>{d.path}</span>}
            </span>
          ))}
        </dd>
        <dt className="small-caps">Script</dt>
        <dd className="break-words"><a href={f.scriptUrl} className={link}>{f.scriptPath}</a>{inputs && ` with ${inputs}`}</dd>
        <dt className="small-caps">Last run</dt>
        <dd>{f.ran ? <time dateTime={f.ran}>{ranOn(f.ran)}</time> : "Not run from published data"}</dd>
        <dt className="small-caps">Licence</dt>
        <dd>
          {f.licence?.startsWith("CC-BY-SA 3.0") ? (
            <>
              <a href="https://creativecommons.org/licenses/by-sa/3.0/" className={link}>CC-BY-SA 3.0</a>, from{" "}
              <a href="https://en.wiktionary.org" className={link}>Wiktionary</a> via{" "}
              <a href="https://kaikki.org" className={link}>Kaikki</a>
            </>
          ) : (f.licence ?? "Not stated")}
        </dd>
      </dl>
    </li>
  );
}

export default function Page() {
  const figures = loadFigures();
  const rendered = figures.filter((f) => f.image).length;
  return (
    <main className="stone-bone relative">
      <div className="mx-auto max-w-[1100px] px-4 py-14 md:px-6 md:py-24">
        <div className="small-caps mb-5 text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">§ Research · figures</div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.75rem)] uppercase leading-[1.05] text-[color:var(--basalt)]">
          every <span className="inlay-gold">figure.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          {figures.length} figures drawn by scripts in the repository. {rendered} render from published data. The rest wait until their data is published. Language figures come first.
        </p>
        <div className="carved-rule mt-10 max-w-xs" />
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {figures.map((f) => <FigureCard key={f.name} f={f} />)}
        </ul>
      </div>
    </main>
  );
}
