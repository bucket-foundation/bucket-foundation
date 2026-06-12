"use client";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import Link from "next/link";
import InverseOmega from "./InverseOmega";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  sub?: { href: string; label: string; meta?: string }[];
};

const NAV: NavItem[] = [
  {
    href: "/canon",
    label: "Canon",
    sub: [
      { href: "/canon/search",   label: "Search",        meta: "599 claims, 9 branches" },
      { href: "/canon/claims",   label: "All claims",    meta: "browse the cards" },
      { href: "/canon/bridges",  label: "Bridges",       meta: "17 multi-branch primitives" },
      { href: "/canon/graph",    label: "Knowledge graph", meta: "1,133 nodes · PageRank" },
    ],
  },
  // 6 tabs total. Build → /protocol, /learn, /research (hub row on /build).
  // About → /governance, /manifesto, /contributors, /join.
  { href: "/whats-new", label: "What's new" },
  { href: "/build",     label: "Build" },
  { href: "/academy",   label: "Academy" },
  { href: "/access",    label: "Access" },
  { href: "/chat",      label: "Chat" },
  { href: "/about",     label: "About" },
];

const CANON = [
  { slug: "mathematics", num: "I",    name: "mathematics" },
  { slug: "physics",     num: "II",   name: "physics"     },
  { slug: "chemistry",   num: "III",  name: "chemistry"   },
  { slug: "information", num: "IV",   name: "information" },
  { slug: "biophysics",  num: "V",    name: "biophysics"  },
  { slug: "cosmology",   num: "VI",   name: "cosmology"   },
  { slug: "mind",        num: "VII",  name: "mind"        },
  { slug: "earth",       num: "VIII", name: "earth"       },
];

const HAS_DYNAMIC = !!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID;

export default function Header() {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null); // desktop hover dropdown
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const closeDrawer = () => { setOpen(false); setExpandedMobile(null); };

  // Hover handlers: small open delay so cursor swipes don't open randomly;
  // small close delay so cursor can travel to the dropdown without it flickering shut.
  const openSubmenu = (label: string) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setOpenSub(label);
  };
  const scheduleClose = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpenSub(null), 120);
  };

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
            {NAV.map((n) => (
              <div
                key={n.href}
                className="relative"
                onMouseEnter={() => n.sub && openSubmenu(n.label)}
                onMouseLeave={() => n.sub && scheduleClose()}
              >
                <Link
                  href={n.href}
                  className="hover:text-[color:var(--aegean-deep)] transition border-b-2 border-transparent hover:border-[color:var(--gold)] pb-1 min-h-[44px] flex items-center"
                  aria-haspopup={n.sub ? "true" : undefined}
                  aria-expanded={n.sub ? openSub === n.label : undefined}
                >
                  {n.label}
                  {n.sub && (
                    <span className="ml-1.5 text-[8px] text-[color:var(--parchment-dim)]">
                      ▾
                    </span>
                  )}
                </Link>
                {n.sub && openSub === n.label && (
                  <div
                    className="absolute left-0 top-full mt-1 w-[300px] rounded-md border border-[color:var(--hairline)] bg-[color:var(--bone)] shadow-[0_8px_24px_-8px_rgba(31,28,22,0.25)] z-50"
                    onMouseEnter={() => openSubmenu(n.label)}
                    onMouseLeave={scheduleClose}
                  >
                    <ul className="py-2">
                      {n.sub.map((s) => (
                        <li key={s.href}>
                          <Link
                            href={s.href}
                            className="flex flex-col px-4 py-2.5 hover:bg-[color:var(--bone-2)] transition"
                          >
                            <span
                              className="text-[12px] tracking-[0.08em] uppercase"
                              style={{ color: "var(--basalt)", fontFamily: "var(--font-jetbrains)" }}
                            >
                              {s.label}
                            </span>
                            {s.meta && (
                              <span
                                className="text-[10px] tracking-[0.05em] mt-0.5"
                                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)", textTransform: "none", letterSpacing: 0 }}
                              >
                                {s.meta}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {/* Canon branches sub-grid only for the Canon dropdown */}
                    {n.label === "Canon" && (
                      <>
                        <div className="border-t border-[color:var(--hairline)] mx-2" />
                        <div className="px-4 pt-2 pb-1 small-caps text-[9px] text-[color:var(--gold)] tracking-[0.22em]">
                          Branches
                        </div>
                        <ul className="grid grid-cols-2 gap-x-2 px-2 pb-2">
                          {CANON.map((b) => (
                            <li key={b.slug}>
                              <Link
                                href={`/canon/${b.slug}`}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[color:var(--bone-2)] transition"
                              >
                                <span className="font-display text-[10px] text-[color:var(--gold-deep)] w-5">
                                  {b.num}
                                </span>
                                <span className="text-[11px] uppercase tracking-[0.06em] text-[color:var(--basalt)]">
                                  {b.name}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {HAS_DYNAMIC ? (
              <div className="hidden sm:block"><DynamicWidget /></div>
            ) : (
              <Link
                href="/join"
                className="hidden sm:inline-flex small-caps text-[11px] text-[color:var(--bone)] bg-[color:var(--laurel-deep)] px-5 py-2 rounded-sm shadow-[0_1px_0_rgba(239,232,212,0.35)_inset,0_2px_6px_rgba(31,28,22,0.25)] hover:bg-[color:var(--aegean-deep)] transition items-center min-h-[44px]"
              >
                Contribute
              </Link>
            )}
            {/* Hamburger — md:hidden */}
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

      {/* === MOBILE DRAWER ============================================ */}
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
              {NAV.map((n) => {
                const isExpanded = expandedMobile === n.label;
                return (
                  <li key={n.href} className="border-b border-[color:var(--hairline)]">
                    {n.sub ? (
                      <>
                        <div className="flex items-stretch min-h-[52px]">
                          <Link
                            href={n.href}
                            onClick={closeDrawer}
                            className="flex-1 flex items-center px-5 text-[color:var(--basalt)] font-display uppercase text-[14px] tracking-[0.08em] active:bg-[color:var(--bone-2)] transition"
                          >
                            {n.label}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setExpandedMobile(isExpanded ? null : n.label)}
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${n.label}`}
                            aria-expanded={isExpanded}
                            className="px-5 border-l border-[color:var(--hairline)] text-[color:var(--gold-deep)] hover:bg-[color:var(--bone-2)] transition"
                          >
                            <span className={`inline-block transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                              ▾
                            </span>
                          </button>
                        </div>
                        {isExpanded && (
                          <ul className="bg-[color:var(--bone-2)] pb-2">
                            {n.sub.map((s) => (
                              <li key={s.href}>
                                <Link
                                  href={s.href}
                                  onClick={closeDrawer}
                                  className="block px-7 py-3 small-caps text-[11px] text-[color:var(--basalt-2)] active:bg-[color:var(--bone-3)] transition"
                                >
                                  <span className="block tracking-[0.08em]">{s.label}</span>
                                  {s.meta && (
                                    <span className="block text-[10px] mt-0.5 normal-case tracking-normal text-[color:var(--parchment-dim)]"
                                          style={{ fontFamily: "var(--font-fraunces)" }}>
                                      {s.meta}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            ))}
                            {n.label === "Canon" && (
                              <>
                                <li className="px-7 pt-3 pb-1 small-caps text-[9px] text-[color:var(--gold)] tracking-[0.22em]">
                                  Branches
                                </li>
                                {CANON.map((b) => (
                                  <li key={b.slug}>
                                    <Link
                                      href={`/canon/${b.slug}`}
                                      onClick={closeDrawer}
                                      className="flex items-center gap-3 px-7 py-2 text-[color:var(--basalt-2)] active:bg-[color:var(--bone-3)]"
                                    >
                                      <span className="font-display text-[11px] text-[color:var(--gold-deep)] w-6">
                                        {b.num}
                                      </span>
                                      <span className="font-display uppercase text-[12px] tracking-[0.05em]">
                                        {b.name}
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </>
                            )}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={n.href}
                        onClick={closeDrawer}
                        className="flex items-center justify-between px-5 py-4 min-h-[52px] text-[color:var(--basalt)] font-display uppercase text-[14px] tracking-[0.08em] active:bg-[color:var(--bone-2)] transition"
                      >
                        <span>{n.label}</span>
                        <span className="text-[color:var(--gold-deep)]">→</span>
                      </Link>
                    )}
                  </li>
                );
              })}
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
            {HAS_DYNAMIC ? (
              <DynamicWidget />
            ) : (
              <Link
                href="/join"
                onClick={closeDrawer}
                className="block text-center small-caps text-[12px] text-[color:var(--bone)] bg-[color:var(--laurel-deep)] px-6 py-4 rounded-sm shadow-[0_1px_0_rgba(239,232,212,0.35)_inset,0_2px_6px_rgba(31,28,22,0.25)] min-h-[52px] tracking-[0.1em]"
              >
                Contribute to the canon
              </Link>
            )}
            <div className="mt-3 text-center text-[10px] small-caps text-[color:var(--basalt-3)] tracking-[0.15em]">
              free to read · paid to cite
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
