import Link from "next/link";
import NavItem from "./NavItem";
import FooterSwitch from "./FooterSwitch";
import { EXPLORE_LINKS, INVOLVED_LINKS, LAUNCH_LIST_LABEL, LEGAL_LINKS, OPEN_SOURCE_LINKS, POLINGUAL_LINK, SIGN_IN_LINK, SLIM_LINKS } from "@/lib/routes";
import Logo from "./Logo";
import FooterVersion from "./FooterVersion";
import { CANON_BRANCHES } from "@/lib/contribute";

type FooterProps = { launchList?: boolean; signInClosed?: boolean };

export default function SiteFooter({ variant, ...props }: FooterProps & { variant?: "full" | "slim" }) {
  if (variant === "slim") return <SlimFooter />;
  if (variant === "full") return <FullFooter {...props} />;
  return <FooterSwitch slim={<SlimFooter />} full={<FullFooter {...props} />} />;
}

function SlimFooter() {
  return (
    <footer data-slim-footer className="border-t border-[color:var(--hairline)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[12px] text-[color:var(--basalt-3)]">
        <span>bucket foundation · nonprofit</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5">
          {SLIM_LINKS.map((l) => (
            <NavItem key={l.href} link={l} className="min-h-[44px] inline-flex items-center hover:text-[color:var(--basalt)]" />
          ))}
        </nav>
      </div>
    </footer>
  );
}

function FullFooter({ launchList = false, signInClosed = false }: FooterProps) {
  return (
    <footer className="relative z-[2] mt-0 stone-basalt border-t-4 border-[color:var(--gold)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-10 text-[color:var(--bone-3)]">
        <div className="flex flex-col gap-4">
          <Logo size={48} />
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
            {CANON_BRANCHES.slice(0, 4).map((b) => (
              <li key={b.slug}><Link href={`/canon/${b.slug}`} className="hover:text-[color:var(--bone)] transition">{b.roman} · {b.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">&nbsp;</div>
          <ul className="space-y-2 text-sm">
            {CANON_BRANCHES.slice(4).map((b) => (
              <li key={b.slug}><Link href={`/canon/${b.slug}`} className="hover:text-[color:var(--bone)] transition">{b.roman} · {b.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            {EXPLORE_LINKS.map((l) => (
              <li key={l.href}><NavItem link={l} className="hover:text-[color:var(--bone)] transition" /></li>
            ))}
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Get involved</div>
          <ul className="space-y-2 text-sm">
            {INVOLVED_LINKS.map((l) => (
              <li key={l.href}><NavItem link={l} className="hover:text-[color:var(--bone)] transition" /></li>
            ))}
            <li><NavItem link={signInClosed ? POLINGUAL_LINK : launchList ? { ...SIGN_IN_LINK, label: LAUNCH_LIST_LABEL } : SIGN_IN_LINK} className="hover:text-[color:var(--bone)] transition" /></li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10px] text-[color:var(--gold)] mb-4">Open source</div>
          <ul className="space-y-2 text-sm">
            {OPEN_SOURCE_LINKS.map((l) => (
              <li key={l.href}><NavItem link={l} className="hover:text-[color:var(--bone)] transition" /></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[color:var(--hairline-bone)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 flex flex-wrap gap-4 justify-between text-[10px] small-caps text-[color:var(--bone-3)]">
          <div>bucket foundation · nonprofit · MIT code · CC0 intent · <FooterVersion /></div>
          <div className="flex gap-4">
            {LEGAL_LINKS.map((l) => <NavItem key={l.href} link={l} className="hover:text-[color:var(--bone)] transition" />)}
          </div>
          <div className="text-[color:var(--gold)]">carved in stone · mmxxii</div>
        </div>
      </div>
    </footer>
  );
}
