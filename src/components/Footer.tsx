import Link from "next/link";
import Shield from "./Shield";

export default function Footer() {
  return (
    <footer className="mt-32 border-t hairline">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10 text-[color:var(--parchment-dim)]">
        <div className="flex flex-col gap-3">
          <div className="text-[color:var(--gold)]">
            <Shield size={40} />
          </div>
          <div className="font-serif-display text-lg text-[color:var(--parchment)]">
            bucket.foundation
          </div>
          <p className="text-sm leading-relaxed">
            build the past.<br />
            build history.<br />
            <span className="italic text-[color:var(--parchment)]">bucket is the new renaissance.</span>
          </p>
        </div>

        <div>
          <div className="small-caps text-xs text-[color:var(--gold)] mb-3">Canon</div>
          <ul className="space-y-1 text-sm">
            <li><Link href="/canon/mathematics" className="hover:text-[color:var(--parchment)]">01 · mathematics</Link></li>
            <li><Link href="/canon/physics"     className="hover:text-[color:var(--parchment)]">02 · physics</Link></li>
            <li><Link href="/canon/chemistry"   className="hover:text-[color:var(--parchment)]">03 · chemistry</Link></li>
            <li><Link href="/canon/information" className="hover:text-[color:var(--parchment)]">04 · information</Link></li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-xs text-[color:var(--gold)] mb-3">&nbsp;</div>
          <ul className="space-y-1 text-sm">
            <li><Link href="/canon/biophysics" className="hover:text-[color:var(--parchment)]">05 · biophysics</Link></li>
            <li><Link href="/canon/cosmology"  className="hover:text-[color:var(--parchment)]">06 · cosmology</Link></li>
            <li><Link href="/canon/mind"       className="hover:text-[color:var(--parchment)]">07 · mind</Link></li>
            <li><Link href="/canon/earth"      className="hover:text-[color:var(--parchment)]">08 · earth</Link></li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-xs text-[color:var(--gold)] mb-3">Open</div>
          <ul className="space-y-1 text-sm">
            <li><a href="https://github.com/bucket-foundation/bucket-research" className="hover:text-[color:var(--parchment)]">bucket-research</a></li>
            <li><a href="https://github.com/bucket-foundation/bucket-foundation" className="hover:text-[color:var(--parchment)]">bucket-foundation</a></li>
            <li><a href="https://github.com/gianyrox/feed402" className="hover:text-[color:var(--parchment)]">feed402 protocol</a></li>
            <li><Link href="/manifesto" className="hover:text-[color:var(--parchment)]">Manifesto</Link></li>
            <li><Link href="/governance" className="hover:text-[color:var(--parchment)]">Governance</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t hairline">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between text-[11px] small-caps text-[color:var(--parchment-dim)]">
          <div>bucket foundation · nonprofit · MIT code · CC0 intent</div>
          <div>build the past</div>
        </div>
      </div>
    </footer>
  );
}
