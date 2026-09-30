import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import corpusIndex from "../../../learning/app/corpus/index.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academy · lessons and recall",
  description:
    "The Academy is the Learn module of Research OS: a foundations-first deck for each canon branch, with spaced recall. It opens with Research OS at launch.",
  alternates: { canonical: "/academy" },
};

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

type DeckRow = { id: string; pill?: string; sub?: string; kind?: string };

const DECKS: DeckRow[] = (corpusIndex.decks as DeckRow[]).filter((d) => d.kind !== "language");

const LINK = "underline decoration-[color:var(--gold)] underline-offset-4 text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]";

function deckName(d: DeckRow): string {
  return (d.pill ?? d.id).replace(/^\S+\s+·\s+/, "");
}

export default async function AcademyPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUser();
  if (user) {
    const pick = (k: string) => {
      const v = searchParams?.[k];
      const s = Array.isArray(v) ? v[0] : v;
      return typeof s === "string" && SLUG.test(s) ? s : null;
    };
    const branch = pick("branch") ?? pick("deck");
    const atom = pick("atom");
    if (branch && atom) redirect(`/research-os/learn/${branch}/${atom}`);
    if (branch) redirect(`/research-os/learn/${branch}`);
    redirect("/research-os/learn");
  }

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-14 md:py-28">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">§ Academy</div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] chisel text-[color:var(--basalt)]">
          lessons and recall for <span className="inlay-gold">every branch.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          The Academy is the Learn module of Research OS. Each canon branch is a deck of atoms ordered from foundations
          upward. You read an atom, answer from memory, and the scheduler brings it back before you forget it.
        </p>
        <p className="mt-4 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
          Research OS is in private testing, so the decks sit behind sign-in until the launch list opens. Join the list
          and we write once, the day it opens. The desktop app runs the same decks offline.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/sign-in?next=/academy"
            className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            Join the launch list →
          </Link>
          <Link
            href="/download"
            className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
          >
            Download →
          </Link>
        </div>

        <h2 className="mt-16 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]">the decks</h2>
        <ul className="mt-6 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          {DECKS.map((d) => (
            <li key={d.id} className="bg-[color:var(--bone)] p-5 md:p-6">
              <div className="font-display uppercase text-[16px] tracking-[0.04em] text-[color:var(--basalt)]">{deckName(d)}</div>
              {d.sub && <p className="mt-1 text-[14px] leading-[1.6] text-[color:var(--basalt-2)]">{d.sub}</p>}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-[13px] leading-[1.7] text-[color:var(--basalt-3)]">
          Read the branches themselves in the{" "}
          <Link href="/canon" className={LINK}>
            canon
          </Link>
          , or see where the Academy sits on the{" "}
          <Link href="/ladder" className={LINK}>
            depth ladder
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
