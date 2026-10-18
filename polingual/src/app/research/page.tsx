import Signup from "../signup";
import { Tex } from "../tex";

const NAV = [
    { id: "record", label: "The record" },
  { id: "math", label: "The math" },
  { id: "network", label: "The network" },
  { id: "ranking", label: "Search at scale" },
  { id: "sources", label: "Sources" },
  { id: "questions", label: "Open questions" },
  { id: "join", label: "Join" },
];

const RECORD = `{
  "id": "photon:word:en:gravity",
  "kind": "word",
  "lang": "en",
  "surface": "gravity",
  "meaning_en": "The attractive force between masses.",
  "ipa": "/ˈɡɹævɪti/",
  "pos": "noun",
  "tier": "nucleus",
  "relations": [
    { "predicate": "derives_from", "to": "photon:word:la:gravitas" },
    { "predicate": "translates",   "to": "photon:word:de:schwerkraft" },
    { "predicate": "translates",   "to": "photon:word:ja:重力" }
  ]
}`;

const PREDICATES = [
  ["translates", "Same meaning in another language", "gravity → Schwerkraft"],
  ["derives_from", "Etymological ancestor", "gravity → gravitas"],
  ["synonym_of", "Same language, same meaning", "entropy → disorder"],
  ["attested_at", "First appearance in a corpus", "gravity → 1644"],
];

const SOURCES = [
  ["Wiktionary via Kaikki", "35 languages, English glosses, IPA", "live, CC BY-SA"],
  ["Open Multilingual WordNet", "~30 languages", "planned"],
  ["PanLex", "1,300+ languages", "planned"],
  ["Tatoeba", "400+ languages, parallel sentences", "planned"],
];

const QUESTIONS = [
  ["Polysemy", "bank the river and bank the institution are two records with two meanings. Today each Wiktionary sense becomes its own record. Picking the right sense from context comes later."],
  ["Compounds", "\"second law of thermodynamics\" is stored as one phrase record and also as word records linked to it, so both phrase and word queries work."],
  ["Re-embedding", "When the embedding model changes, every vector is rebuilt and ids stay fixed. Old vectors are kept so we can measure how far each word moved."],
  ["Learner signal", "A speaker of two languages can say when two words line up and when they drift. We want that judgment as labeled data for the joint score."],
];

function H2({ id, n, children }: { id: string; n: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-8 flex items-baseline gap-3 text-3xl md:text-4xl" style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}>
      <span style={{ color: "var(--ink)" }}>{n}</span>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 font-sans text-[17px] leading-8 max-w-[68ch]" style={{ color: "var(--ink-2)" }}>{children}</p>;
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg px-5 py-3 text-[17px]" style={{ background: "var(--sky-2)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="scroll-fade mt-4 overflow-x-auto rounded-lg bg-white" style={{ border: "1px solid var(--hairline)" }}>
      <table className="w-full min-w-[540px] font-sans text-[15px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-dim)", borderBottom: "1px solid var(--hairline)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} className={`px-4 py-2 align-top ${i === 0 ? "font-mono text-[13px]" : ""}`} style={{ color: "var(--ink-2)", borderTop: "1px solid var(--hairline)" }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <main className="min-h-screen relative">
      <div className="hero-glow absolute inset-x-0 top-0 h-[480px] pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 md:px-8 md:grid md:grid-cols-[180px_1fr] md:gap-12">
        <aside className="hidden md:block">
          <nav className="sticky top-8 pt-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="polingual" width="120" height="48" className="h-10 w-auto mb-8" />
            <ul className="space-y-2 font-sans text-sm">
              {NAV.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="hover:underline" style={{ color: "var(--ink-dim)" }}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl pb-24">
          <header className="pt-10 md:pt-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="polingual" width="120" height="48" className="h-10 w-auto mb-6 md:hidden" />
            <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-dim)" }}>polingual v0, research notes</p>
            <h1 className="mt-4 leading-[1.05] text-[clamp(2.2rem,5vw,3.8rem)]" style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}>
              Every word in every language, <em style={{ color: "var(--blue)" }}>one meaning.</em>
            </h1>
            <p className="mt-6 text-center text-[15px] font-bold" style={{ color: "var(--ink)" }}>Abstract</p>
            <P>
              polingual is a cross-lingual dictionary and an open research project. It holds 6.5 million words in 35
              languages. Each word is a record with an English meaning, two vectors, and links to the same idea in
              other languages.
            </P>
            <p className="mt-6 font-sans text-[15px]"><a href="/" className="underline" style={{ color: "var(--blue)" }}>Back to search</a></p>
            <div className="mt-6 max-w-lg">
              <p className="font-sans text-[15px] font-semibold" style={{ color: "var(--ink)" }}>Speak two languages or more? Get early access to the learner tools.</p>
              <div className="mt-2"><Signup compact /></div>
            </div>
          </header>

          <details className="md:hidden sticky top-0 z-10 -mx-4 mt-8 px-4 py-3 font-sans text-[15px] backdrop-blur" style={{ background: "color-mix(in srgb, var(--sky) 88%, transparent)", borderBottom: "1px solid var(--hairline)" }}>
            <summary className="cursor-pointer font-semibold" style={{ color: "var(--ink)" }}>Contents</summary>
            <ul className="mt-2 space-y-2">
              {NAV.map((n) => (
                <li key={n.id}><a href={`#${n.id}`} style={{ color: "var(--ink-2)" }}>{n.label}</a></li>
              ))}
            </ul>
          </details>



          <section className="mt-20">
            <H2 id="record" n="1">The record</H2>
            <P>
              We call each record a photon. A photon has one id, one surface form in its own script, and one meaning
              written in English. Each dictionary sense gets its own record. Translations stay separate records joined
              by links.
            </P>
            <pre className="scroll-fade mt-4 overflow-x-auto rounded-lg bg-white px-5 py-4 font-mono text-[12.5px] leading-6" style={{ border: "1px solid var(--hairline)", color: "var(--ink)" }}>{RECORD}</pre>
          </section>

          <section className="mt-20">
            <H2 id="math" n="2">The math</H2>
            <P>
              Notation: <Tex>{String.raw`w`}</Tex> is a word record, <Tex>{String.raw`V`}</Tex> the set of all{" "}
              <Tex>{String.raw`N`}</Tex> records, <Tex>{String.raw`q`}</Tex> a query, and{" "}
              <Tex>{String.raw`\Vert`}</Tex> concatenation. Each word gets two unit vectors. The semantic vector embeds the text &ldquo;surface: meaning&rdquo; with
              LaBSE, a multilingual sentence model, into <Tex>{String.raw`\mathbb{R}^{768}`}</Tex>. The phonetic vector is built by hand from the
              IPA transcription into <Tex>{String.raw`\mathbb{R}^{64}`}</Tex>.
            </P>
            <Formula>
              <Tex block>{String.raw`s(w) = \mathrm{LaBSE}\big(\text{surface}(w) \,\Vert\, \text{": "} \,\Vert\, \text{meaning}_{en}(w)\big) \in \mathbb{R}^{768}, \qquad \lVert s(w) \rVert_2 = 1 \tag{1}`}</Tex>
              <Tex block>{String.raw`p(w) = \frac{v(x)}{\lVert v(x) \rVert_2} \in \mathbb{R}^{64}, \qquad x = (x_1, \dots, x_n) = \text{ipa}(w) \tag{2}`}</Tex>
              <Tex block>{String.raw`d(a, b) = 1 - \cos(a, b) = 1 - a^{\top} b \quad \text{for unit } a, b \tag{3}`}</Tex>
            </Formula>
            <P>
              Two words mean the same thing when their semantic vectors point the same way. LaBSE was trained on
              translation pairs, and every record carries an English gloss, so light, אור, luce and valo sit close
              together with no translation step at query time.
            </P>
            <P>
              The phonetic vector answers a separate question: which words sound alike, whatever they mean. Its 64
              slots concatenate four blocks built from the IPA segments <Tex>{String.raw`x_i`}</Tex>, where{" "}
              <Tex>{String.raw`f(x_i)`}</Tex> is the segment&rsquo;s articulatory features (vowel height, backness,
              rounding; consonant place, manner, voicing):
            </P>
            <Formula>
              <Tex block>{String.raw`v(x) = \Big[\, \tfrac{1}{n}\textstyle\sum_{i} f(x_i) \;\Big\Vert\; f(x_1),\, f(x_{\lfloor n/2 \rfloor + 1}),\, f(x_n) \;\Big\Vert\; \tfrac{\min(n,16)}{16},\, \tfrac{\min(\sigma,4)}{4} \;\Big\Vert\; \tfrac{1}{n-1}\textstyle\sum_{i} e_{h(x_i x_{i+1})} \,\Big] \tag{4}`}</Tex>
              <Tex block>{String.raw`h(\cdot) = \mathrm{md5}(\cdot) \bmod 14, \qquad \sigma = \text{number of stress marks} \tag{5}`}</Tex>
            </Formula>
            <Table
              head={["Slots", "Block"]}
              rows={[
                ["0 to 19", "average vowel height, backness and rounding; consonant place, manner and voicing"],
                ["32 to 45", "the first, middle and last segment, plus vowel and consonant ratios"],
                ["48 to 49", "word length and stress marks"],
                ["50 to 63", "sound bigrams hashed into 14 buckets"],
              ]}
            />
            <P>Slots 6 to 7, 20 to 31 and 46 to 47 are reserved and stay zero.</P>
            <P>
              Sound search finds loanwords and shared roots across scripts. Words close on both vectors are the cognates:
              gravitas, gravity, gravedad. A joint score mixes the two distances with a weight{" "}
              <Tex>{String.raw`\alpha`}</Tex>:
            </P>
            <Formula>
              <Tex block>{String.raw`\mathrm{score}_{\alpha}(q, w) = \alpha \, d\big(s(q), s(w)\big) + (1 - \alpha)\, d\big(p(q), p(w)\big), \qquad \alpha \in [0, 1] \tag{6}`}</Tex>
              <Tex block>{String.raw`\mathrm{top}_k(q) = \operatorname*{arg\,min}_{W \subset V,\ |W| = k} \; \sum_{w \in W} \mathrm{score}_{\alpha}(q, w) \tag{7}`}</Tex>
            </Formula>
            <P>
              Lower is closer. <Tex>{String.raw`\alpha = 1`}</Tex> is pure meaning search and{" "}
              <Tex>{String.raw`\alpha = 0`}</Tex> is pure sound search. Choosing <Tex>{String.raw`\alpha`}</Tex> per
              query, and checking it against human judgment, is open work.
            </P>
          </section>

          <section className="mt-20">
            <H2 id="network" n="3">The network</H2>
            <P>
              Records link to each other through typed edges. Following translates edges gives a translation table.
              Following derives_from edges backward gives an etymology: English to Latin to Greek, or Japanese back
              through Old Chinese readings.
            </P>
            <Table head={["Predicate", "Meaning", "Example"]} rows={PREDICATES} />
            <P>
              Every record carries a confidence tier: nucleus for settled entries, functional for sourced ones, edge
              for contested ones, and unverified for raw imports. The same graph powers{" "}
              <a href="https://www.bucket.foundation" className="underline" style={{ color: "var(--blue)" }}>bucket.foundation</a>,
              which reads it as research claims. polingual reads it as words.
            </P>
          </section>

          <section className="mt-20">
            <H2 id="ranking" n="4">Search at scale</H2>
            <P>
              The full index holds 6,564,942 records across 35 languages. 1,979,896 of them have IPA and a phonetic
              vector. Both vector columns live in Postgres with pgvector and an HNSW index, so a nearest-neighbor query
              walks a layered graph and visits about <Tex>{String.raw`O(\log N)`}</Tex> nodes instead of scanning all{" "}
              <Tex>{String.raw`N = 6{,}564{,}942`}</Tex> rows.
            </P>
            <Table
              head={["Query", "What it does", "Latency"]}
              rows={[
                ["lookup", "exact surface form in one language", "1 ms"],
                ["semantic", "nearest meaning vectors", "3 ms"],
                ["phonetic", "nearest sound vectors", "1.5 ms"],
                ["translate", "nearest meaning, filtered to a target language", "3 ms"],
                ["spelling", "trigram match on the surface form", "~160 ms"],
              ]}
            />
            <P>
              Latencies are single warm queries against the full 6.5M-row index on one local Postgres server with
              pgvector, measured 2026-06-16 through the query API. The search box on the homepage covers a 209,000-word subset in 27 languages with text search: exact surface match, then prefix, then substring,
              then English full-text over the meanings, merged in that order until it has 30 results.
            </P>
            <P>
              Semantic search works best for words with close neighbors: gold finds silver and golden, king finds
              monarch. Isolated scientific terms such as entropy get weak neighbors, and the dictionary has gaps.
            </P>
          </section>

          <section className="mt-20">
            <H2 id="sources" n="5">Sources</H2>
            <P>
              Every record keeps its source URL and capture date. Dictionary data comes from{" "}
              <a href="https://en.wiktionary.org" className="underline" style={{ color: "var(--blue)" }}>Wiktionary</a>{" "}
              through <a href="https://kaikki.org" className="underline" style={{ color: "var(--blue)" }}>Kaikki</a>,
              under CC BY-SA 4.0.
            </P>
            <Table head={["Source", "Coverage", "Status"]} rows={SOURCES} />
          </section>

          <section className="mt-20">
            <H2 id="questions" n="6">Open questions</H2>
            <dl className="mt-4 space-y-5">
              {QUESTIONS.map(([t, d]) => (
                <div key={t}>
                  <dt className="font-sans text-[15px] font-semibold" style={{ color: "var(--ink)" }}>{t}</dt>
                  <dd className="mt-1 font-sans text-[15px] leading-7" style={{ color: "var(--ink-2)" }}>{d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-20">
            <H2 id="join" n="7">Join the learner list</H2>
            <P>
              We are building learning tools for people who already speak two or more languages: learn the next
              language through the ones you know. Leave your email, and tell us your languages if you like. We will write when the first
              tools open, and we may ask you to rate a few word pairs.
            </P>
            <div className="mt-6 max-w-md">
              <Signup />
            </div>
          </section>

          <footer className="mt-24 space-y-2 font-sans text-[13px]" style={{ color: "var(--ink-dim)" }}>
            <p>
              Dictionary data from <a href="https://en.wiktionary.org" className="underline">Wiktionary</a> via{" "}
              <a href="https://kaikki.org" className="underline">Kaikki</a>, licensed{" "}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline">CC BY-SA 4.0</a>.
            </p>
            <p>
              Same graph as <a href="https://www.bucket.foundation" className="underline" style={{ color: "var(--blue)" }}>bucket.foundation</a>.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
