import type { ReactNode } from "react";
import { ButtonLink } from "@/ui";
import styles from "./brand.module.css";

export const KIT = "/brand/polingual-press-kit.zip";

export const SECTIONS = [
  ["story", "Story"], ["logo", "Logo"], ["color", "Color"], ["type", "Type"], ["artwork", "Artwork"], ["patterns", "Patterns"],
  ["illustration", "Illustration"], ["motion", "Motion"], ["voice", "Voice"], ["screens", "Product"], ["downloads", "Downloads"],
] as const;

export function Section({ id, n, title, lede, dark, children }: { id: string; n: number; title: string; lede?: ReactNode; dark?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} data-dark={dark || undefined} aria-labelledby={`${id}-h`}>
      <div className={styles.label}>{String(n).padStart(2, "0")} · {SECTIONS[n - 1][1]}</div>
      <h2 id={`${id}-h`} className={styles.h2}>{title}</h2>
      {lede ? <p className={styles.lede}>{lede}</p> : null}
      {children}
    </section>
  );
}

export function Sub({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.sub}>
      <div className={styles.subHead}>
        <h3 className={styles.h3}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Dl({ href, children }: { href: string; children: ReactNode }) {
  return <ButtonLink href={href} download variant="secondary" size="sm">{children}</ButtonLink>;
}

export function StarLattice({ id }: { id: string }) {
  return (
    <svg className={styles.patternSvg} aria-hidden="true">
      <defs>
        <pattern id={id} width="90" height="90" patternUnits="userSpaceOnUse">
          <rect width="90" height="90" style={{ fill: "var(--pl-tyrian)" }} />
          <path d="M0 0L90 90M90 0L0 90M45 0V90M0 45H90" style={{ stroke: "var(--pl-tyrian-deep)", strokeWidth: 2, opacity: 0.6 }} />
          <path d="M45 33l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" style={{ fill: "var(--pl-vermilion)", opacity: 0.55 }} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
