import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import s from "./ui.module.css";

export type Tone = "parchment" | "vermilion" | "lapis" | "malachite" | "ochre" | "tyrian" | "maya" | "ink";

export function Card({ tone, pad, interactive, as: Tag = "div", className, ...rest }: HTMLAttributes<HTMLElement> & { tone?: "ink" | "tyrian" | "plain"; pad?: "sm" | "lg" | "none"; interactive?: boolean; as?: "div" | "section" | "article" | "li" | "aside" | "form" }) {
  return <Tag className={[s.card, className].filter(Boolean).join(" ")} data-tone={tone} data-pad={pad} data-interactive={interactive || undefined} {...rest} />;
}

export function Pill({ active, size, className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; size?: "sm" }) {
  return <button type={type} className={[s.pill, className].filter(Boolean).join(" ")} data-active={active || undefined} data-size={size} {...rest} />;
}

export function Tag({ size, className, style, ...rest }: HTMLAttributes<HTMLSpanElement> & { size?: "sm" }) {
  return <span className={[s.pill, className].filter(Boolean).join(" ")} data-size={size} style={{ cursor: "default", ...style }} {...rest} />;
}

export function Badge({ tone, size, className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; size?: "lg"; children: ReactNode }) {
  return <span className={[s.badge, className].filter(Boolean).join(" ")} data-tone={tone} data-size={size} {...rest}>{children}</span>;
}
