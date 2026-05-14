// polingual.com — landing. Search bar over the photon index.
// Same substrate as bucket.foundation: see ../POLINGUAL.md.

export const metadata = {
  title: "polingual — every word in every language, one meaning",
  description: "Cross-lingual dictionary built on the photon graph. Definitions, translations, etymology, semantic + phonetic neighbours.",
};

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <p className="text-xs uppercase tracking-[0.22em] text-stone-500 mb-4">
        polingual · v0
      </p>
      <h1 className="font-serif text-4xl md:text-6xl text-center max-w-3xl text-stone-900 leading-tight">
        every word in every language,<br /> one meaning.
      </h1>
      <p className="mt-6 max-w-xl text-center text-stone-600">
        Cross-lingual dictionary on the photon graph. Definitions, translations,
        etymology, semantic + phonetic neighbours.
      </p>
      <div className="mt-12 w-full max-w-xl">
        <input
          type="text"
          placeholder="search a word in any language..."
          className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-lg outline-none focus:border-stone-900"
        />
      </div>
      <p className="mt-10 text-xs text-stone-400">
        Status: scaffolding. Photon substrate at{" "}
        <a href="https://www.bucket.foundation" className="underline">
          bucket.foundation
        </a>
      </p>
    </main>
  );
}
