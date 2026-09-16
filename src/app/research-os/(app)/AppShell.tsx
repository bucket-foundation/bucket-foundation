"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The Research OS application frame: a sidebar on wide screens, a tab bar
 * on phones, the person's chip, and one content column. Every app page
 * renders inside it; the landing at /research-os stays outside.
 */
export interface ShellUser {
  email: string | null;
  handle: string | null;
  staff: boolean;
}

interface Item {
  href: string;
  label: string;
  hint: string;
  match: string[];
}

const LEARN: Item[] = [
  { href: "/research-os/home", label: "Home", hint: "today, your path, your classes", match: ["/research-os/home"] },
  { href: "/research-os/workspace", label: "Workspace", hint: "find, quote, check, organize", match: ["/research-os/workspace"] },
  { href: "/research-os/learn", label: "Learn", hint: "lessons and recall", match: ["/research-os/learn"] },
  { href: "/research-os/map", label: "Map", hint: "the canon on the globe", match: ["/research-os/map"] },
  { href: "/research-os/profile", label: "Profile", hint: "levels, consent, privacy", match: ["/research-os/profile"] },
];

const TEACH: Item[] = [
  { href: "/research-os/class", label: "Class", hint: "learners, assignments, overrides", match: ["/research-os/class"] },
  { href: "/research-os/review", label: "Review", hint: "productions waiting on you", match: ["/research-os/review"] },
  { href: "/research-os/roster", label: "Roster", hint: "members and consent", match: ["/research-os/roster"] },
  { href: "/research-os/edges", label: "Edges", hint: "proposed graph links", match: ["/research-os/edges"] },
];

function isOn(item: Item, pathname: string): boolean {
  return item.match.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname() || "/research-os/home";
  const groups: { title: string; items: Item[] }[] = [{ title: "learn", items: LEARN }];
  if (user.staff) groups.push({ title: "teach", items: TEACH });
  const all = groups.flatMap((g) => g.items);
  const name = user.handle || (user.email ? user.email.split("@")[0] : "you");

  return (
    <div className="stone-bone grain min-h-screen">
      {/* Phone tab bar */}
      <nav aria-label="Research OS" className="md:hidden sticky top-[58px] z-30 border-b border-[color:var(--hairline)] bg-[color:var(--bone)]/90 backdrop-blur-[2px]">
        <div className="flex items-center gap-1 overflow-x-auto px-2">
          {all.map((it) => {
            const on = isOn(it, pathname);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={
                  "small-caps text-[10px] tracking-[0.18em] px-3 py-3 whitespace-nowrap border-b-2 min-h-[44px] inline-flex items-center " +
                  (on ? "border-[color:var(--gold)] text-[color:var(--basalt)]" : "border-transparent text-[color:var(--basalt-3)]")
                }
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto md:grid md:grid-cols-[224px_minmax(0,1fr)] md:gap-8 px-4 md:px-6">
        {/* Sidebar */}
        <aside className="hidden md:block py-8">
          <div className="sticky top-[96px]">
            <Link href="/account" className="block p-3 border border-[color:var(--hairline)] rounded-sm hover:bg-[color:var(--bone-2)] transition">
              <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">signed in</div>
              <div className="mt-0.5 text-[14px] text-[color:var(--basalt)] truncate" title={user.email ?? undefined}>{name}</div>
            </Link>
            {groups.map((g) => (
              <div key={g.title} className="mt-6">
                <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] px-3">{g.title}</div>
                <ul className="mt-2 flex flex-col">
                  {g.items.map((it) => {
                    const on = isOn(it, pathname);
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          aria-current={on ? "page" : undefined}
                          className={
                            "block px-3 py-2 rounded-sm border-l-2 transition " +
                            (on ? "border-[color:var(--gold)] bg-[color:var(--bone)] text-[color:var(--basalt)]" : "border-transparent text-[color:var(--basalt-2)] hover:text-[color:var(--basalt)] hover:bg-[color:var(--bone)]/60")
                          }
                        >
                          <div className="text-[13px]">{it.label}</div>
                          <div className="text-[11px] text-[color:var(--basalt-3)]">{it.hint}</div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="mt-6 px-3 flex flex-col gap-2 text-[12px]">
              <Link href="/research-os" className="text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)] underline underline-offset-4">about Research OS</Link>
              <form method="post" action="/auth/sign-out">
                <button type="submit" className="text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)] underline underline-offset-4">sign out</button>
              </form>
            </div>
          </div>
        </aside>

        <div className="min-w-0 py-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}
