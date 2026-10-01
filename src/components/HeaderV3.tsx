"use client";

import Link from "next/link";
import UserMenu from "@/components/auth/UserMenuV2";
import InverseOmega from "./InverseOmega";
import GitHubStarButton from "./GitHubStarButton";
import { useEffect, useState } from "react";

const NAV: { href: string; label: string }[] = [
  { href: "/research-os", label: "Research OS" },
  { href: "/download", label: "Download" },
  { href: "/canon", label: "Canon" },
  { href: "/whats-new", label: "What's new" },
  { href: "/about", label: "About" },
];

export default function HeaderV3({ launchList = false }: { launchList?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const closeDrawer = () => setOpen(false);

  return (
    <>
      <header className="w-full border-b border-[color:var(--hairline)] backdrop-blur-[2px] bg-[color:var(--bone)]/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-3 md:py-5 gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-3 group min-w-0"
            aria-label="bucket.foundation"
            onClick={closeDrawer}
          >
            <InverseOmega size={40} variant="carved" className="shrink-0" />
            <span className="font-display uppercase text-[15px] md:text-[18px] tracking-[0.06em] md:tracking-[0.08em] text-[color:var(--basalt)] font-bold truncate">
              bucket<span className="text-[color:var(--gold-deep)]">.</span>
              <span className="hidden xs:inline sm:inline">foundation</span>
              <span className="inline sm:hidden">foundation</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 small-caps text-[11px] text-[color:var(--basalt-2)]">
            {NAV.filter((n) => n.href !== "/download").map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="hover:text-[color:var(--aegean-deep)] transition border-y-2 border-transparent hover:border-b-[color:var(--gold)] h-11 flex items-center"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/download"
              onClick={closeDrawer}
              className="h-11 flex items-center px-3 md:px-4 rounded-sm bg-[color:var(--gold)] text-[color:var(--basalt)] hover:bg-[color:var(--gold-deep)] hover:text-[color:var(--bone)] transition small-caps text-[11px] tracking-[0.14em]"
            >
              Download
            </Link>
            <GitHubStarButton />
            <UserMenu launchList={launchList} />
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-drawer"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden relative w-11 h-11 flex flex-col items-center justify-center gap-[5px] rounded-sm border border-[color:var(--hairline)] bg-[color:var(--bone-2)]/60 active:bg-[color:var(--bone-3)] transition"
            >
              <span
                className={`block w-5 h-[2px] bg-[color:var(--basalt)] transition-transform origin-center ${
                  open ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`block w-5 h-[2px] bg-[color:var(--basalt)] transition-opacity ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block w-5 h-[2px] bg-[color:var(--basalt)] transition-transform origin-center ${
                  open ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`md:hidden fixed inset-0 z-50 transition-[visibility] ${
          open ? "visible" : "invisible"
        }`}
      >
        <div
          onClick={closeDrawer}
          className={`absolute inset-0 bg-[color:var(--basalt)]/55 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute top-0 right-0 h-full w-[min(88vw,380px)] bg-[color:var(--bone)] shadow-[-8px_0_36px_-12px_rgba(31,28,22,0.45)] flex flex-col transition-transform duration-[320ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--hairline)]">
            <div className="flex items-center gap-2">
              <InverseOmega size={32} variant="carved" />
              <span className="small-caps text-[11px] text-[color:var(--basalt-2)]">
                Bucket Foundation
              </span>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeDrawer}
              className="w-10 h-10 flex items-center justify-center text-[color:var(--basalt)] active:bg-[color:var(--bone-2)] rounded-sm"
            >
              <span className="text-2xl leading-none">×</span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain">
            <ul className="py-2">
              {NAV.map((n) => (
                <li key={n.href} className="border-b border-[color:var(--hairline)]">
                  <Link
                    href={n.href}
                    onClick={closeDrawer}
                    className="flex items-center justify-between px-5 py-4 min-h-[52px] text-[color:var(--basalt)] font-display uppercase text-[14px] tracking-[0.08em] active:bg-[color:var(--bone-2)] transition"
                  >
                    <span>{n.label}</span>
                    <span className="text-[color:var(--gold-deep)]">→</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="h-px mx-5 bg-[color:var(--hairline)] my-2" />

            <ul className="pb-6">
              <li>
                <a
                  href="https://github.com/bucket-foundation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-3 min-h-[44px] text-[color:var(--basalt-2)] small-caps text-[11px] active:bg-[color:var(--bone-2)]"
                >
                  GitHub <span className="text-[color:var(--gold-deep)]">↗</span>
                </a>
              </li>
              <li>
                <Link
                  href="/manifesto"
                  onClick={closeDrawer}
                  className="flex items-center justify-between px-5 py-3 min-h-[44px] text-[color:var(--basalt-2)] small-caps text-[11px] active:bg-[color:var(--bone-2)]"
                >
                  Manifesto
                </Link>
              </li>
              <li>
                <Link
                  href="/governance"
                  onClick={closeDrawer}
                  className="flex items-center justify-between px-5 py-3 min-h-[44px] text-[color:var(--basalt-2)] small-caps text-[11px] active:bg-[color:var(--bone-2)]"
                >
                  Governance
                </Link>
              </li>
            </ul>
          </nav>

          <div className="p-5 border-t border-[color:var(--hairline)] bg-[color:var(--bone-2)]">
            <UserMenu drawer onNavigate={closeDrawer} launchList={launchList} />
            <div className="mt-3 text-center text-[10px] small-caps text-[color:var(--basalt-3)] tracking-[0.15em]">
              free to read · paid to cite
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
