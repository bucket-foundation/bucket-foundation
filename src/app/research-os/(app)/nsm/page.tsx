import type { Metadata } from "next";
import Link from "next/link";
import { configured } from "@/lib/research-os/db";
import { loadNsm } from "@/lib/research-os/nsm-db";
import { byCategory, CLICS_ATTRIBUTION, HIDE_BELOW, NSM_CITATION, UNCERTAIN_BELOW, NSM_LANGS, parseLang, type NsmExponent, type NsmPrime } from "@/lib/research-os/nsm";
import { KAIKKI_ATTRIBUTION, OSHB_ATTRIBUTION, langName } from "@/lib/research-os/node-words";
import RootTexts from "../RootTexts";
import { BABELSTONE_NOTE, UNIHAN_NOTE } from "@/lib/research-os/han-components";

export const metadata: Metadata = { title: "Semantic primes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const H1 = "font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]";

function one(v: string | string[] | undefined): string | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

function Mark({ text }: { text: string }) {
  return <span className="ml-1 small-caps text-[9px] tracking-[0.12em] text-[color:var(--gold-deep)]">{text}</span>;
}

type Labels = Map<string, string>;

function Word({ e, labels }: { e: NsmExponent; labels: Labels }) {
  return (
    <span>
      <span lang={e.lang} dir="auto" className="text-[color:var(--basalt)]">{e.word}</span>
      {e.roman && <span className="text-[color:var(--basalt-3)]"> {e.roman}</span>}
      {e.hidden ? <Mark text="unconfirmed" /> : e.uncertain && <Mark text="uncertain" />}
      {e.colexWith.length > 0 && (
        <span className="ml-1 text-[11px] text-[color:var(--basalt-3)]">
          one word with{" "}
          {e.colexWith.map((o, i) => (
            <span key={o}>
              {i ? ", " : ""}
              <a href={`#prime-${o}`} className="underline underline-offset-4">
                {labels.get(o) ?? o}
              </a>
            </span>
          ))}{" "}
          in CLICS
        </span>
      )}
    </span>
  );
}

function Merges({ p }: { p: NsmPrime }) {
  if (p.colex.length === 0) return null;
  return (
    <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">
      One word carries this prime and another in CLICS:{" "}
      {p.colex.map((c, i) => (
        <span key={`${c.other}-${c.lang}`}>
          {i ? "; " : ""}
          <a href={`#prime-${c.other}`} className="underline underline-offset-4">
            {c.otherLabel}
          </a>{" "}
          in {c.langName}, <span lang={c.lang}>{c.form}</span>
          {c.matched ? "" : ", a word other than the one shown here"}
        </span>
      ))}
      .
    </p>
  );
}

function Han({ e }: { e: NsmExponent }) {
  if (!e.hanParts || e.hanParts.length === 0) return null;
  return (
    <span className="text-[12px] text-[color:var(--basalt-3)]">
      {e.hanParts.map((h, i) => (
        <span key={h.char}>
          {i ? "; " : ""}
          <span lang="zh">{h.char}</span> = {h.parts.map((p) => p.component).join(" + ")}
        </span>
      ))}
      <Mark text={e.hanParts.some((h) => h.parts.some((p) => p.uncertain)) ? "IDS, uncertain" : "IDS"} />
    </span>
  );
}

function Root({ e }: { e: NsmExponent }) {
  if (!e.rootForm) return <span className="text-[color:var(--basalt-3)]">no root shown</span>;
  return (
    <span>
      <span className="small-caps text-[10px] tracking-[0.12em] text-[color:var(--basalt-3)]">{e.rootLangName} </span>
      <span lang={(e.rootLang || "").split("-")[0]} dir="auto">{e.rootForm}</span>
      {e.rootGloss && <span className="text-[color:var(--basalt-3)]"> “{e.rootGloss}”</span>}
      {e.rootSource === "oshb" && <span className="text-[color:var(--basalt-3)]"> · from OSHB</span>}
      {e.rootHidden ? <Mark text="root unconfirmed" /> : e.rootUncertain && <Mark text="root uncertain" />}
    </span>
  );
}

function Sense({ p }: { p: NsmPrime }) {
  if (p.senseStatus === "none") return <span>No Wiktionary entry carries this prime, so it has no exponents here yet.</span>;
  return (
    <span>
      Wiktionary sense of {p.lookup}: “{p.sense}”
      {p.senseStatus === "fallback" && <Mark text="unconfirmed" />}
    </span>
  );
}

function OneLanguage({ p, labels }: { p: NsmPrime; labels: Labels }) {
  if (p.exponents.length === 0) return <p className="mt-1 text-[13px] text-[color:var(--basalt-3)]">No exponent in this language.</p>;
  return (
    <ul className="mt-1 space-y-1 text-[13px]">
      {p.exponents.map((e) => (
        <li key={`${e.lang}-${e.word}`} className="flex flex-wrap gap-x-4">
          <Word e={e} labels={labels} />
          <Root e={e} />
          {e.rootTexts.length > 0 && (
            <div className="basis-full">
              <RootTexts texts={e.rootTexts} lang={e.lang} uncertain={e.uncertain} rootUncertain={e.rootUncertain} />
            </div>
          )}
          <Han e={e} />
        </li>
      ))}
    </ul>
  );
}

function AllLanguages({ p, labels }: { p: NsmPrime; labels: Labels }) {
  if (p.exponents.length === 0) return <p className="mt-1 text-[13px] text-[color:var(--basalt-3)]">No exponents.</p>;
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
      {p.exponents
        .filter((e) => e.rank === 1)
        .map((e) => (
          <li key={`${e.lang}-${e.word}`}>
            <span className="small-caps text-[10px] tracking-[0.12em] text-[color:var(--basalt-3)]">{e.langName} </span>
            <Word e={e} labels={labels} />
          </li>
        ))}
    </ul>
  );
}

function Picker({ lang, hidden }: { lang: string | null; hidden: boolean }) {
  return (
    <form method="get" action="/research-os/nsm" className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-[color:var(--basalt-2)]">
      <label className="flex items-center gap-2">
        <span className={LABEL}>language</span>
        <select name="lang" defaultValue={lang ?? ""} className="border border-[color:var(--hairline)] bg-transparent px-2 py-1">
          <option value="">every language</option>
          {NSM_LANGS.map((l) => (
            <option key={l} value={l}>
              {langName(l)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="hidden" value="1" defaultChecked={hidden} />
        <span>show unconfirmed words</span>
      </label>
      <button type="submit" className="border border-[color:var(--hairline)] px-3 py-1 hover:underline underline-offset-4">
        Show
      </button>
    </form>
  );
}

function Table({ primes, lang }: { primes: NsmPrime[]; lang: string | null }) {
  const labels: Labels = new Map(primes.map((p) => [p.id, p.label]));
  return (
    <>
      {byCategory(primes).map((c) => (
        <section key={c.category} className="mt-8">
          <h2 className={LABEL}>{c.category}</h2>
          <ol className="mt-2 border-t border-[color:var(--hairline)]">
            {c.primes.map((p) => (
              <li key={p.id} id={`prime-${p.id}`} className="border-b border-[color:var(--hairline)] py-3 md:grid md:grid-cols-[11rem_1fr] md:gap-4">
                <div className="font-display text-[15px] text-[color:var(--basalt)]">{p.label}</div>
                <div>
                  <p className="text-[12px] text-[color:var(--basalt-3)]">
                    <Sense p={p} />
                  </p>
                  {lang ? <OneLanguage p={p} labels={labels} /> : <AllLanguages p={p} labels={labels} />}
                  <Merges p={p} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}

export default async function NsmPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const parsed = parseLang(one(searchParams?.lang));
  const lang = parsed ?? null;
  const hidden = one(searchParams?.hidden) === "1";
  let primes: NsmPrime[] | null = null;
  let failed = false;
  if (configured()) {
    try {
      primes = await loadNsm({ lang, includeHidden: hidden });
    } catch (err) {
      console.error("[nsm] read failed:", err instanceof Error ? err.message : err);
      failed = true;
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1000px]">
      <h1 className={H1}>Semantic primes</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[70ch]">
        The 65 meanings that the Natural Semantic Metalanguage finds in every language studied, each with the words that carry it in the languages Polingual reads, and the root each word grew from. Every word comes from the one Wiktionary sense named beside it.
      </p>
      <p className="mt-2 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">
        A word shows when its confidence is {HIDE_BELOW} or above, and is marked uncertain below {UNCERTAIN_BELOW}. A root has its own confidence under the same thresholds; a root read from one word of a phrase stays hidden. Words from a fallback sense score lower, are marked unconfirmed, and stay hidden until you ask for them.
      </p>
      <Picker lang={lang} hidden={hidden} />
      {parsed === undefined && <p className="mt-3 text-[13px] text-[color:var(--gold-deep)]">That language code is not one this page reads, so every language is shown.</p>}
      {!configured() ? (
        <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">This deployment has no graph connected, so there are no primes to show.</p>
      ) : failed || !primes ? (
        <p role="alert" className="mt-6 text-[13px] text-[color:var(--gold-deep)]">
          The graph did not answer this minute, so the primes were not read.{" "}
          <Link href="/research-os/nsm" className="underline underline-offset-4">
            Try again
          </Link>
          .
        </p>
      ) : primes.length === 0 ? (
        <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">The primes have not been loaded into this graph yet.</p>
      ) : (
        <Table primes={primes} lang={lang} />
      )}
      <footer className="mt-10 border-t border-[color:var(--hairline)] pt-3 text-[11px] leading-relaxed text-[color:var(--basalt-3)] max-w-[70ch]">
        <p>
          {NSM_CITATION.text}{" "}
          <a href={NSM_CITATION.doi} className="underline underline-offset-4">
            {NSM_CITATION.doi}
          </a>
        </p>
        <p className="mt-1">
          {KAIKKI_ATTRIBUTION.text}{" "}
          <a href={KAIKKI_ATTRIBUTION.kaikki} className="underline underline-offset-4">
            Kaikki.org
          </a>
          ,{" "}
          <a href={KAIKKI_ATTRIBUTION.license} className="underline underline-offset-4">
            CC BY-SA 4.0
          </a>
          .
        </p>
        <p className="mt-1">
          {BABELSTONE_NOTE.text}{" "}
          <a href={BABELSTONE_NOTE.href} className="underline underline-offset-4">
            BabelStone IDS
          </a>
          . {UNIHAN_NOTE.text}{" "}
          <a href={UNIHAN_NOTE.license} className="underline underline-offset-4">
            Unicode License v3
          </a>
          .
        </p>
        <p className="mt-1">
          Hebrew roots and verses: {OSHB_ATTRIBUTION.text}, under{" "}
          <a href={OSHB_ATTRIBUTION.license} className="underline underline-offset-4">
            CC BY 4.0
          </a>
          . {OSHB_ATTRIBUTION.wlc}
        </p>
        <p className="mt-1">
          {CLICS_ATTRIBUTION.text}{" "}
          <a href={CLICS_ATTRIBUTION.doi} className="underline underline-offset-4">
            {CLICS_ATTRIBUTION.doi}
          </a>
          ,{" "}
          <a href={CLICS_ATTRIBUTION.license} className="underline underline-offset-4">
            CC BY 4.0
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
