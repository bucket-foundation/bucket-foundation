import Search from "@/app/search";
import Signup from "@/app/signup";
import { Tex } from "@/app/tex";
import { pageMeta } from "@/lib/meta";
import Site from "@/app/site";

export const metadata = pageMeta({ path: "/archive", title: "Polingual archive", documentTitle: "Polingual", description: "The Polingual word archive: search words by meaning, sound and spelling across languages.", noindex: true });

const STATS = [
  ["6.5M", "words indexed"],
  ["209k", "searchable here"],
  ["768", "meaning dimensions"],
  ["64", "sound dimensions"],
];

function ArchiveFoot() {
  return (
    <>
      <section className="mt-16 rounded-xl bg-white px-5 py-6 md:px-8 border-[1px] border-[var(--hairline)]">
        <Tex block>{String.raw`\mathrm{score}_{\alpha}(q, w) = \alpha \, d\big(s(q), s(w)\big) + (1 - \alpha)\, d\big(p(q), p(w)\big)`}</Tex>
        <p className="mt-3 text-[16px] leading-7 text-center text-[color:var(--ink-2)]">
          Each word has a meaning vector <Tex>{String.raw`s`}</Tex> and a sound vector <Tex>{String.raw`p`}</Tex>.
          Close on both means a cognate.{" "}
          <a href="/research#math" className="underline text-[color:var(--blue)]">The math</a>
        </p>
      </section>

      <footer className="mt-16 text-center text-[13px] text-[color:var(--ink-dim)]">
        Data from <a href="https://en.wiktionary.org" className="underline">Wiktionary</a> via{" "}
        <a href="https://kaikki.org" className="underline">Kaikki</a>,{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline">CC BY-SA 4.0</a>. Same graph as{" "}
        <a href="https://www.bucket.foundation" className="underline">bucket.foundation</a>.
      </footer>
    </>
  );
}

export default function HomePage() {
  return (
    <Site bare>
    <div className="relative">
      <div className="hero-glow absolute inset-x-0 top-0 h-[520px] pointer-events-none" />
      <div className="relative mx-auto max-w-3xl px-4 md:px-8 pb-20">
        <nav className="flex items-center justify-between pt-6 font-sans text-[15px]">
          <a href="/research" className="hover:underline text-[color:var(--ink-dim)]">Research</a>
        </nav>

        <header className="pt-14 md:pt-20 text-center">
          <h1 className="leading-[1.05] text-[clamp(2.4rem,6vw,4.2rem)] text-[color:var(--ink)]">
            Every word in every language, <em className="text-[color:var(--blue)]">one meaning.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[19px] leading-8 text-center text-[color:var(--ink-2)]">
            Polingual is the language part of Bucket. Learn your next language through the ones you already speak.
          </p>
          <a
            href="https://www.bucket.foundation/download"
            className="mt-7 inline-block rounded-xl px-7 py-3.5 font-sans text-[17px] font-medium text-white bg-[var(--blue)]"
          >
            Download Bucket
          </a>
        </header>

        <section className="mt-14">
          <Search />
        </section>

        <section className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map(([n, l]) => (
            <div key={l} className="rounded-xl bg-white px-4 py-4 text-center border-[1px] border-[var(--hairline)]">
              <p className="text-3xl text-center text-[color:var(--ink)]">{n}</p>
              <p className="mt-1 text-[14px] text-center text-[color:var(--ink-dim)]">{l}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 mx-auto max-w-md">
          <h2 className="mb-3 text-center text-[20px] text-[color:var(--ink)]">Get language updates</h2>
          <Signup compact />
        </section>

        <ArchiveFoot />
      </div>
    </div>
    </Site>
  );
}
