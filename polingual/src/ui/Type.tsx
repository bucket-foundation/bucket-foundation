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

export function SectionHeading({ children, eyebrow, action, onDark, className, ...rest }: P & { eyebrow?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cx(s.section, className)} {...rest}>
      <div className={s.sectionText}>
        {eyebrow ? <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow> : null}
        <h2 className={s.sectionTitle} data-dark={onDark || undefined}>{children}</h2>
      </div>
      {action ? <div className={s.sectionAction}>{action}</div> : null}
    </div>
  );
}

export function Header({ eyebrow, title, lede, art, actions, onDark, className, ...rest }: Omit<HTMLAttributes<HTMLElement>, "title"> & { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; art?: ReactNode; actions?: ReactNode; onDark?: boolean }) {
  return (
    <header className={cx(s.header, className)} data-art={art ? true : undefined} {...rest}>
      <div className={s.headerText}>
        {eyebrow ? <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow> : null}
        <Title onDark={onDark}>{title}</Title>
        {lede ? <Lede onDark={onDark}>{lede}</Lede> : null}
        {actions ? <div className={s.headerActions}>{actions}</div> : null}
      </div>
      {art ? <div className={s.headerArt} aria-hidden="true">{art}</div> : null}
    </header>
  );
}

export function Stack({ children, className, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cx(s.stack, className)} {...rest}>{children}</div>;
}
