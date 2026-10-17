import Search from "./search";
import Signup from "./signup";

const NAV = [
  { id: "search", label: "Search" },
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
      <span className="font-mono text-xs" style={{ color: "var(--blue)" }}>{n}</span>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 font-sans text-[15px] leading-7" style={{ color: "var(--ink-2)" }}>{children}</p>;
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg px-5 py-4 font-mono text-[13px] leading-6" style={{ background: "var(--sky-2)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg bg-white" style={{ border: "1px solid var(--hairline)" }}>
      <table className="w-full font-sans text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-dim)", borderBottom: "1px solid var(--hairline)" }}>{h}</th>
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

export default function HomePage() {
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
            <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--ink-faint)" }}>polingual v0, research notes</p>
            <h1 className="mt-4 leading-[1.05] text-[clamp(2.2rem,5vw,3.8rem)]" style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}>
              Every word in every language, <em style={{ color: "var(--blue)" }}>one meaning.</em>
            </h1>
            <P>
              polingual is a cross-lingual dictionary and an open research project. It holds 6.5 million words in 35
              languages. Each word is a record with an English meaning, two vectors, and links to the same idea in
              other languages.
            </P>
            <p className="mt-4 font-sans text-sm">
              <a href="#join" className="underline" style={{ color: "var(--blue)" }}>Speak two languages or more? Join the learner list.</a>
            </p>
          </header>

          <section className="mt-10">
            <Search />
          </section>

          <section className="mt-20">
            <H2 id="record" n="01">The record</H2>
            <P>
              We call each record a photon. A photon has one id, one surface form in its own script, and one meaning
              written in English. Each dictionary sense gets its own record. Translations stay separate records joined
              by links.
            </P>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-white px-5 py-4 font-mono text-[12.5px] leading-6" style={{ border: "1px solid var(--hairline)", color: "var(--ink)" }}>{RECORD}</pre>
          </section>

          <section className="mt-20">
            <H2 id="math" n="02">The math</H2>
            <P>
              Each word gets two unit vectors. The semantic vector embeds the text &ldquo;surface: meaning&rdquo; with
              LaBSE, a multilingual sentence model, into 768 dimensions. The phonetic vector is built by hand from the
              IPA transcription into 64 dimensions.
            </P>
            <Formula>
              s(w) = LaBSE(surface + &quot;: &quot; + meaning_en) ∈ ℝ⁷⁶⁸, &nbsp; ‖s‖ = 1<br />
              p(w) = phon(ipa) ∈ ℝ⁶⁴, &nbsp; ‖p‖ = 1<br />
              d(a, b) = 1 − a · b
            </Formula>
            <P>
              Two words mean the same thing when their semantic vectors point the same way. LaBSE was trained on
              translation pairs, and every record carries an English gloss, so light, אור, luce and valo sit close
              together with no translation step at query time.
            </P>
            <P>
              The phonetic vector answers a separate question: which words sound alike, whatever they mean. Its 64
              slots hold four groups of features:
            </P>
            <Table
              head={["Slots", "Feature"]}
              rows={[
                ["0 to 19", "average vowel height, backness and rounding; consonant place, manner and voicing"],
                ["32 to 45", "the first, middle and last segment, plus vowel and consonant ratios"],
                ["48 to 49", "word length and stress marks"],
                ["50 to 63", "sound bigrams hashed into 14 buckets"],
              ]}
            />
            <P>
              Sound search finds loanwords and shared roots across scripts. Words close on both vectors are the cognates:
              gravitas, gravity, gravedad. A joint score mixes the two distances with a weight α:
            </P>
            <Formula>
              score(q, w) = α · d(s(q), s(w)) + (1 − α) · d(p(q), p(w)), &nbsp; 0 ≤ α ≤ 1
            </Formula>
            <P>
              Choosing α per query, and checking it against human judgment, is open work.
            </P>
          </section>

          <section className="mt-20">
            <H2 id="network" n="03">The network</H2>
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
            <H2 id="ranking" n="04">Search at scale</H2>
            <P>
              The full index holds 6,564,942 records across 35 languages. 1,979,896 of them have IPA and a phonetic
              vector. Both vector columns live in Postgres with pgvector and an HNSW index, so a nearest-neighbor query
              walks a graph of the vectors instead of scanning every row.
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
              The search box on this page runs a lighter text search: exact surface match, then prefix, then substring,
              then English full-text over the meanings, merged in that order until it has 30 results.
            </P>
            <P>
              Semantic search works best for words with close neighbors: gold finds silver and golden, king finds
              monarch. Isolated scientific terms such as entropy get weak neighbors, and the dictionary has gaps.
            </P>
          </section>

          <section className="mt-20">
            <H2 id="sources" n="05">Sources</H2>
            <P>
              Every record keeps its source URL and capture date. Dictionary data comes from{" "}
              <a href="https://en.wiktionary.org" className="underline" style={{ color: "var(--blue)" }}>Wiktionary</a>{" "}
              through <a href="https://kaikki.org" className="underline" style={{ color: "var(--blue)" }}>Kaikki</a>,
              under CC BY-SA 4.0.
            </P>
            <Table head={["Source", "Coverage", "Status"]} rows={SOURCES} />
          </section>

          <section className="mt-20">
            <H2 id="questions" n="06">Open questions</H2>
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
            <H2 id="join" n="07">Join the learner list</H2>
            <P>
              We are building learning tools for people who already speak two or more languages: learn the next
              language through the ones you know. Leave your email and your languages. We will write when the first
              tools open, and we may ask you to rate a few word pairs.
            </P>
            <div className="mt-6 max-w-md">
              <Signup />
            </div>
          </section>

          <footer className="mt-24 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--ink-faint)" }}>
            same graph as{" "}
            <a href="https://www.bucket.foundation" className="underline" style={{ color: "var(--blue)" }}>bucket.foundation</a>
          </footer>
        </div>
      </div>
    </main>
  );
}
