import PageShell from "@/components/PageShell";
import Link from "next/link";

export const metadata = { title: "About · bucket.foundation" };

export default function Page() {
  return (
    <PageShell
      eyebrow="§ about"
      title="A nonprofit canon of foundations."
      subtitle="Held in founder's personal capacity pending formal nonprofit filing."
    >
      <div className="space-y-6 text-lg text-[color:var(--parchment-dim)] leading-relaxed">
        <p>
          bucket.foundation exists to make primary research <strong className="text-[color:var(--parchment)]">paid-for-once</strong> and <strong className="text-[color:var(--parchment)]">citeable-forever</strong> — and to route citation fees to authors, not publishers.
        </p>
        <p>
          It is built for the small number of people who can take a model and an axiom and reach a layer of reality nobody has reached before. AI + foundations + a small number of brilliant humans = the next layer of reality.
        </p>
        <p>
          Canon holds only <em>foundations</em>: axioms, real math, rules, laws, principles, primary derivations. Outcomes — longevity, disease, cognition — are downstream applications, cross-mirrored into the branches that derive them.
        </p>
        <p>
          The work is open-source under <Link href="/governance" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">MIT code + CC0 intent</Link>. The protocol is <Link href="/protocol" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">feed402</Link> over x402 on Base. The reference site is this one. The research index is <a href="https://github.com/bucket-foundation/bucket-research" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">bucket-research</a>.
        </p>
      </div>

      <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mt-16 mb-6">
        History, briefly.
      </h2>
      <div className="space-y-6 text-lg text-[color:var(--parchment-dim)] leading-relaxed">
        <p>
          <strong className="text-[color:var(--parchment)]">2022.</strong> bucket 1.0 shipped as a four-verb prototype — <em>build · discuss · discover · publish</em> — a social network for collaboratively building and debating theories of history with evidence. It never shipped publicly. The slogan: <span className="italic">build the past.</span>
        </p>
        <p>
          <strong className="text-[color:var(--parchment)]">2023–2025.</strong> The prototype slept. The slogan widened: <span className="italic">build history.</span> A hackathon build landed the reference site on Vercel — Story Protocol IP mint, Walrus storage, Dynamic web3 auth.
        </p>
        <p>
          <strong className="text-[color:var(--parchment)]">2026.</strong> Reactivated as an open-source nonprofit. Two verbs deleted, canon added. The thesis turned: <span className="italic">bucket is the new renaissance.</span> Read the <Link href="/manifesto" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">manifesto</Link>.
        </p>
      </div>
    </PageShell>
  );
}
