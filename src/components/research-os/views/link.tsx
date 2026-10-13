import type { ReactElement, ReactNode } from "react";

export type RosLinkProps = { href: string; className?: string; children?: ReactNode };

export type RosLink = (props: RosLinkProps) => ReactElement;

export const anchorLink: RosLink = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);
