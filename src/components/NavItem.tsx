import Link from "next/link";
import type { NavLink } from "@/lib/routes";

export default function NavItem({ link, className }: { link: NavLink; className?: string }) {
  if (link.external) {
    return (
      <a href={link.href} className={className} {...(link.newTab ? { target: "_blank", rel: "noreferrer" } : {})}>
        {link.label}
      </a>
    );
  }
  return <Link href={link.href} className={className}>{link.label}</Link>;
}
