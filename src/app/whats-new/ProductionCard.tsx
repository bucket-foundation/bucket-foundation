import Image from "next/image";
import type { Production } from "./page";

export default function ProductionCard({ production }: { production: Production }) {
  const images = [...(production.image ? [{ src: production.image, alt: production.image_alt }] : []), ...(production.extra_images ?? [])];
  return (
    <article id={production.id} className="border hairline bg-[color:var(--bone-2)] p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 small-caps text-[10px]">
        <span className="text-[color:var(--gold)]">production</span>
        <span className="text-[color:var(--parchment-dim)]">· {production.date}</span>
        {production.pr !== undefined && production.pr !== null && (
          <a
            href={production.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--parchment-dim)] hover:text-[color:var(--gold)]"
          >
            · #{production.pr} {production.status === "open" ? "open" : "merged"}
          </a>
        )}
      </div>
      <h3 className="font-serif-display text-2xl leading-snug text-[color:var(--basalt)] mb-4">
        {production.title}
      </h3>
      <figure className="mb-5">
        <div className={images.length > 1 ? "grid gap-3 md:grid-cols-2 items-start" : ""}>
          {images.map((img) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={1200}
              height={1200}
              sizes={images.length > 1 ? "(min-width: 768px) 45vw, 100vw" : "(min-width: 768px) 70vw, 100vw"}
              className="w-full h-auto border hairline"
            />
          ))}
        </div>
        <figcaption className="mt-3 text-sm text-[color:var(--parchment)] font-medium">
          {production.plot_title}
        </figcaption>
      </figure>
      {production.discussion && (
        <p className="text-sm leading-relaxed text-[color:var(--parchment-dim)] mb-4">{production.discussion}</p>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 small-caps text-[10px]">
        {production.links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]"
            >
              {link.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
