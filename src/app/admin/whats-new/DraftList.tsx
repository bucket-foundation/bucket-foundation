import GenerationCard, { type Generation } from "../../whats-new/GenerationCard";

export interface Draft {
  id: string;
  kind: string;
  date: string;
  title: string;
  poster: string;
  updated_at: string;
  source?: string;
  [field: string]: unknown;
}

interface DraftProduction extends Draft {
  summary?: string;
  plot_title?: string;
  image_alt?: string;
  discussion?: string;
  status?: string;
  links?: { label: string; href: string }[];
  image?: { filename: string; width: number; height: number; bytes: number };
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export default function DraftList({ drafts }: { drafts: Draft[] }) {
  const productions = drafts.filter((d) => d.kind === "production") as DraftProduction[];
  const generations = drafts.filter((d) => d.kind === "generation");
  const titles = new Map(productions.map((p) => [p.id, p.title]));
  if (drafts.length === 0) return <p className="mt-6 text-sm text-[color:var(--parchment-dim)]">No drafts are waiting.</p>;
  return (
    <div className="mt-6">
      <p className="mb-8 text-sm text-[color:var(--parchment-dim)]">
        {count(productions.length, "draft production")} and {count(generations.length, "draft generation")}. Nothing here is public until it is published.
      </p>
      {productions.length > 0 && (
        <section className="mb-12">
          <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">Draft productions</h2>
          <div className="grid gap-8">
            {productions.map((p) => (
              <article key={p.id} id={p.id} className="border hairline bg-[color:var(--bone-2)] p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 small-caps text-[10px]">
                  <span className="text-[color:var(--gold)]">production</span>
                  <span className="text-[color:var(--parchment-dim)]">· {p.date}</span>
                  <span className="text-[color:var(--parchment-dim)]">· draft by {p.poster}, not published</span>
                  {p.source && p.source !== "own" && <span className="text-[color:var(--basalt)]">· not own work, cannot be published</span>}
                </div>
                <h3 className="font-serif-display text-2xl leading-snug text-[color:var(--basalt)] mb-2">{p.title}</h3>
                {p.summary && <p className="text-sm text-[color:var(--parchment)] mb-4">{p.summary}</p>}
                <p className="text-sm text-[color:var(--parchment)] font-medium mb-1">{p.plot_title}</p>
                <p className="text-sm text-[color:var(--parchment-dim)] mb-4">
                  {p.image ? `Image ${p.image.filename}, ${p.image.width} by ${p.image.height} pixels. Described as: ${p.image_alt ?? ""}` : "No image."}
                </p>
                {p.discussion && <p className="text-sm leading-relaxed text-[color:var(--parchment-dim)] mb-4">{p.discussion}</p>}
                <ul className="flex flex-wrap gap-x-4 gap-y-1 small-caps text-[10px]">
                  {(p.links ?? []).map((link) => (
                    <li key={link.href}>
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]">
                        {link.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}
      {generations.length > 0 && (
        <section>
          <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">Draft generations</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {generations.map((g) => (
              <GenerationCard key={g.id} generation={g as unknown as Generation} parentTitle={titles.get(String(g.parent ?? ""))} draftBy={g.poster} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
