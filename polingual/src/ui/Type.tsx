import type { HTMLAttributes, ReactNode } from "react";
import s from "./type.module.css";

type P = HTMLAttributes<HTMLElement> & { children: ReactNode; onDark?: boolean };
const cx = (a: string, b?: string) => (b ? `${a} ${b}` : a);

export function Eyebrow({ children, onDark, className, ...rest }: P) {
  return <p className={cx(s.eyebrow, className)} data-dark={onDark || undefined} {...rest}>{children}</p>;
}

export function Title({ children, onDark, className, ...rest }: P) {
  return <h1 className={cx(s.title, className)} data-dark={onDark || undefined} {...rest}>{children}</h1>;
}

export function Lede({ children, onDark, className, ...rest }: P) {
  return <p className={cx(s.lede, className)} data-dark={onDark || undefined} {...rest}>{children}</p>;
}

export function Stack({ children, className, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cx(s.stack, className)} {...rest}>{children}</div>;
}
