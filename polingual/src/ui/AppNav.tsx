import Link from "next/link";
import { Art, type ArtName } from "./art";
import s from "./nav.module.css";

export type NavItem = { href: string; label: string; art: ArtName; active: boolean; testId: string };

export function AppNav({ items, label = "Polingual" }: { items: NavItem[]; label?: string }) {
  return (
    <nav className={s.nav} aria-label={label} data-testid="app-nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={s.item} aria-current={i.active ? "page" : undefined} data-testid={i.testId}>
          <span className={s.icon} aria-hidden><Art name={i.art} size={26} /></span>
          <span className={s.label}>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
