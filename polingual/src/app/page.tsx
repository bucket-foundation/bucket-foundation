import Search from "./search";
import Signup from "./signup";
import { Tex } from "./tex";

const STATS = [
  ["6.5M", "words indexed"],
  ["209k", "searchable here"],
  ["768", "meaning dimensions"],
  ["64", "sound dimensions"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen relative">
      <div className="hero-glow absolute inset-x-0 top-0 h-[520px] pointer-events-none" />
      <div className="relative mx-auto max-w-3xl px-4 md:px-8 pb-20">
        <nav className="flex items-center justify-between pt-6 font-sans text-[15px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="polingual" width="100" height="40" className="h-9 w-auto" />
          <a href="/research" style={{ color: "var(--ink-dim)" }} className="hover:underline">Research</a>
        </nav>

        <header className="pt-14 md:pt-20 text-center">
          <h1 className="leading-[1.05] text-[clamp(2.4rem,6vw,4.2rem)]" style={{ color: "var(--ink)" }}>
            Every word in every language, <em style={{ color: "var(--blue)" }}>one meaning.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[19px] leading-8 text-center" style={{ color: "var(--ink-2)" }}>
            Polingual is the language part of Bucket. Learn your next language through the ones you already speak.
          </p>
          <a
            href="https://www.bucket.foundation/download"
            className="mt-7 inline-block rounded-xl px-7 py-3.5 font-sans text-[17px] font-medium text-white"
            style={{ background: "var(--blue)" }}
          >
            Download Bucket
          </a>
        </header>

        <section className="mt-14">
          <Search />
        </section>

        <section className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map(([n, l]) => (
            <div key={l} className="rounded-xl bg-white px-4 py-4 text-center" style={{ border: "1px solid var(--hairline)" }}>
              <p className="text-3xl text-center" style={{ color: "var(--ink)" }}>{n}</p>
              <p className="mt-1 text-[14px] text-center" style={{ color: "var(--ink-dim)" }}>{l}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 mx-auto max-w-md">
          <h2 className="mb-3 text-center text-[20px]" style={{ color: "var(--ink)" }}>Get language updates</h2>
          <Signup compact />
        </section>

        <section className="mt-16 rounded-xl bg-white px-5 py-6 md:px-8" style={{ border: "1px solid var(--hairline)" }}>
          <Tex block>{String.raw`\mathrm{score}_{\alpha}(q, w) = \alpha \, d\big(s(q), s(w)\big) + (1 - \alpha)\, d\big(p(q), p(w)\big)`}</Tex>
          <p className="mt-3 text-[16px] leading-7 text-center" style={{ color: "var(--ink-2)" }}>
            Each word has a meaning vector <Tex>{String.raw`s`}</Tex> and a sound vector <Tex>{String.raw`p`}</Tex>.
            Close on both means a cognate.{" "}
            <a href="/research#math" className="underline" style={{ color: "var(--blue)" }}>The math</a>
          </p>
        </section>

        <footer className="mt-16 text-center text-[13px]" style={{ color: "var(--ink-dim)" }}>
          Data from <a href="https://en.wiktionary.org" className="underline">Wiktionary</a> via{" "}
          <a href="https://kaikki.org" className="underline">Kaikki</a>,{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline">CC BY-SA 4.0</a>. Same graph as{" "}
          <a href="https://www.bucket.foundation" className="underline">bucket.foundation</a>.
        </footer>
      </div>
    </main>
  );
}
