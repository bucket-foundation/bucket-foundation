import { windowHref } from "../site-fetch";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string | { pathname?: string }; children?: ReactNode; prefetch?: boolean };

export default function Link({ href, children, prefetch: _prefetch, ...rest }: Props) {
  const url = typeof href === "string" ? href : (href.pathname ?? "#");
  const external = /^https:\/\//.test(url);
  return (
    <a href={external ? url : (windowHref(url) ?? "#")} target={external ? "_blank" : undefined} rel={external ? "noreferrer noopener" : undefined} {...rest}>
      {children}
    </a>
  );
}
