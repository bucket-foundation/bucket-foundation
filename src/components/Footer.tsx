import Link from "next/link";
import InverseOmega from "./InverseOmega";

export default function Footer() {
  return (
    <footer className="mt-0 stone-basalt border-t-4 border-[color:var(--gold)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-10 text-[color:var(--bone-3)]">
        <div className="flex flex-col gap-4">
          <InverseOmega size={48} variant="inlay" />
          <div className="font-display uppercase text-lg text-[color:var(--bone)] tracking-[0.06em]">
            bucket.foundation
          </div>
          <p className="text-sm leading-relaxed font-mono-mark">
            build the past.<br />
            build history.<br />
            <span className="italic text-[color:var(--gold)]">bucket is the new renaissance.</span>
          </p>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Canon</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/canon/mathematics" className="hover:text-[color:var(--bone)] transition">I · mathematics</Link></li>
            <li><Link href="/canon/physics"     className="hover:text-[color:var(--bone)] transition">II · physics</Link></li>
            <li><Link href="/canon/chemistry"   className="hover:text-[color:var(--bone)] transition">III · chemistry</Link></li>
            <li><Link href="/canon/information" className="hover:text-[color:var(--bone)] transition">IV · information</Link></li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">&nbsp;</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/canon/biophysics" className="hover:text-[color:var(--bone)] transition">V · biophysics</Link></li>
            <li><Link href="/canon/cosmology"  className="hover:text-[color:var(--bone)] transition">VI · cosmology</Link></li>
            <li><Link href="/canon/mind"       className="hover:text-[color:var(--bone)] transition">VII · mind</Link></li>
            <li><Link href="/canon/earth"      className="hover:text-[color:var(--bone)] transition">VIII · earth</Link></li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/canon/search" className="hover:text-[color:var(--bone)] transition">Search canon</Link></li>
            <li><Link href="/canon/bridges" className="hover:text-[color:var(--bone)] transition">Bridges</Link></li>
            <li><Link href="/canon/graph" className="hover:text-[color:var(--bone)] transition">Knowledge graph</Link></li>
            <li><Link href="/canon/timeline" className="hover:text-[color:var(--bone)] transition">Timeline</Link></li>
            <li><Link href="/canon/claims" className="hover:text-[color:var(--bone)] transition">All claims</Link></li>
            <li><Link href="/sacred-history" className="hover:text-[color:var(--bone)] transition">Sacred history</Link></li>
            <li><Link href="/access" className="hover:text-[color:var(--bone)] transition">How to access</Link></li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Get involved</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/mission" className="hover:text-[color:var(--bone)] transition">Mission · reform education</Link></li>
            <li><Link href="/contribute" className="hover:text-[color:var(--bone)] transition">Contribute</Link></li>
            <li><Link href="/support" className="hover:text-[color:var(--bone)] transition">Support / fund</Link></li>
            <li><Link href="/research" className="hover:text-[color:var(--bone)] transition">Publish research</Link></li>
            <li><Link href="/research/papers" className="hover:text-[color:var(--bone)] transition">Atlas papers</Link></li>
            <li><Link href="/research/education" className="hover:text-[color:var(--bone)] transition">Education research</Link></li>
            <li><Link href="/research/education/knowledge-access-gradient" className="hover:text-[color:var(--bone)] transition">Knowledge-Access Gradient</Link></li>
            <li><Link href="/research/tools" className="hover:text-[color:var(--bone)] transition">Research tools</Link></li>
            <li><Link href="/join" className="hover:text-[color:var(--bone)] transition">Join</Link></li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Open source</div>
          <ul className="space-y-2 text-sm">
            <li><a href="https://github.com/bucket-foundation/bucket-foundation" className="hover:text-[color:var(--bone)] transition" target="_blank" rel="noreferrer">bucket-foundation</a></li>
            <li><a href="https://github.com/bucket-foundation/x402-research-gateway" className="hover:text-[color:var(--bone)] transition" target="_blank" rel="noreferrer">x402-gateway</a></li>
            <li><a href="https://github.com/bucket-foundation/research-atlas" className="hover:text-[color:var(--bone)] transition" target="_blank" rel="noreferrer">research-atlas</a></li>
            <li><a href="https://github.com/bucket-foundation/education-atlas" className="hover:text-[color:var(--bone)] transition" target="_blank" rel="noreferrer">education-atlas</a></li>
            <li><a href="https://github.com/bucket-foundation/education-atlas/blob/main/docs/THE-KNOWLEDGE-ACCESS-GRADIENT.md" className="hover:text-[color:var(--bone)] transition" target="_blank" rel="noreferrer">knowledge-access gradient</a></li>
            <li><a href="/feed.xml" className="hover:text-[color:var(--bone)] transition">RSS feed</a></li>
            <li><Link href="/manifesto" className="hover:text-[color:var(--bone)] transition">Manifesto</Link></li>
            <li><Link href="/governance" className="hover:text-[color:var(--bone)] transition">Governance</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[color:var(--hairline-bone)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 flex flex-wrap gap-4 justify-between text-[10px] small-caps text-[color:var(--bone-3)]">
          <div>bucket foundation · nonprofit · MIT code · CC0 intent · v0.2.0</div>
          <div className="text-[color:var(--gold)]">carved in stone · mmxxii</div>
        </div>
      </div>
    </footer>
  );
}
