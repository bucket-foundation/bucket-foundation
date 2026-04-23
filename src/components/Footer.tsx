import Link from "next/link";
import InverseOmega from "./InverseOmega";

export default function Footer() {
  return (
    <footer className="mt-0 stone-basalt border-t-4 border-[color:var(--gold)]">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10 text-[color:var(--bone-3)]">
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
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Open</div>
          <ul className="space-y-2 text-sm">
            <li><a href="https://github.com/bucket-foundation/bucket-research" className="hover:text-[color:var(--bone)] transition">bucket-research</a></li>
            <li><a href="https://github.com/bucket-foundation/bucket-foundation" className="hover:text-[color:var(--bone)] transition">bucket-foundation</a></li>
            <li><a href="https://github.com/gianyrox/feed402" className="hover:text-[color:var(--bone)] transition">feed402 protocol</a></li>
            <li><Link href="/manifesto" className="hover:text-[color:var(--bone)] transition">Manifesto</Link></li>
            <li><Link href="/governance" className="hover:text-[color:var(--bone)] transition">Governance</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[color:var(--hairline-bone)]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap gap-4 justify-between text-[10px] small-caps text-[color:var(--bone-3)]">
          <div>bucket foundation · nonprofit · MIT code · CC0 intent · v0.2.0</div>
          <div className="text-[color:var(--gold)]">carved in stone · mmxxii</div>
        </div>
      </div>
    </footer>
  );
}
