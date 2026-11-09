import type { Metadata } from "next";
import Link from "next/link";
import calendar from "@/data/omega-seasons.json";
import InverseOmega from "@/components/InverseOmega";

export const metadata: Metadata = {
  title: "Omega Seasons",
  description:
    "The stable gold omega lyre and 24 monthly seasons of alternate app icons and badges.",
  alternates: { canonical: "/brand/seasons" },
};

const monthLabel = (ym: string) =>
  new Date(`${ym}-15T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default function SeasonsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 text-[#f7f4ec]">
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#8a5a12]">Stable mark</p>
        <div className="rounded-[40px] bg-[#15130f] p-4 shadow-[0_0_60px_rgba(232,178,58,0.35)]">
          <InverseOmega size={160} variant="inlay" title={calendar.stableMark.name} />
        </div>
        <h1 className="font-serif text-4xl text-[#1c1a16]">Omega Seasons</h1>
        <p className="max-w-xl text-sm text-[#3b372f]">
          The gold lyre never changes. Each month ships one seasonal app icon and four
          badges, starting {monthLabel(calendar.start)}, {calendar.months} seasons in all.
        </p>
      </section>

      <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {calendar.seasons.map((s) => (
          <li
            key={s.month}
            className="flex flex-col gap-3 rounded-2xl border border-[#e8b23a]/25 bg-[#15130f] p-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-widest text-[#e8b23a]">
                Season {s.season}
              </span>
              <span className="text-xs text-[#9c9584]">{monthLabel(s.month)}</span>
            </div>
            <div className="flex items-center gap-4">
              <img
                src={s.hero.image}
                alt={`${s.name} app icon, ${s.hero.label}`}
                width={88}
                height={88}
                className="rounded-[22px]"
              />
              <div>
                <h2 className="font-serif text-2xl leading-tight">{s.name}</h2>
                <p className="mt-1 text-xs text-[#9c9584]">{s.events}</p>
              </div>
            </div>
            <ul className="flex gap-2">
              {s.badges.map((b) => (
                <li key={b.slug} className="flex flex-col items-center gap-1">
                  <img
                    src={b.image}
                    alt={`${b.label} badge`}
                    width={52}
                    height={52}
                    className="rounded-full border border-[#e8b23a]/40"
                  />
                  <span className="w-14 truncate text-center text-[10px] text-[#cfc8b8]">
                    {b.label}
                  </span>
                </li>
              ))}
            </ul>
            <Link href={s.feature.href} className="text-sm text-[#e7dfcc] hover:text-[#e8b23a]">
              {s.feature.text}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
