import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import s from "./ui.module.css";

export type ButtonVariant = "primary" | "secondary" | "accent" | "success" | "gold" | "ghost" | "quiet";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

type Shared = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; onDark?: boolean; icon?: ReactNode; iconOnly?: boolean; className?: string; children?: ReactNode };

export function buttonClass({ variant = "primary", size = "lg", block, onDark, iconOnly, className }: Omit<Shared, "icon" | "children">) {
  return [s.btn, s[variant], s[size], block && s.block, onDark && s.onDark, iconOnly && s.iconOnly, className].filter(Boolean).join(" ");
}

export function Button({ variant, size, block, onDark, icon, iconOnly, bare, className, children, type = "button", ...rest }: Shared & { bare?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={bare ? className : buttonClass({ variant, size, block, onDark, iconOnly, className })} {...rest}>
      {icon && <span className={s.icon} aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, onDark, icon, iconOnly, className, children, href, ...rest }: Shared & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const cls = buttonClass({ variant, size, block, onDark, iconOnly, className });
  const inner = <>{icon && <span className={s.icon} aria-hidden>{icon}</span>}{children}</>;
  if (href.startsWith("/") && !href.startsWith("//") && !rest.download) return <Link href={href} className={cls} {...rest}>{inner}</Link>;
  return <a href={href} className={cls} {...rest}>{inner}</a>;
}
