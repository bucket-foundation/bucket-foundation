"use client";

import { usePathname } from "next/navigation";
import { SCREENS } from "./screens";
import s from "./design.module.css";

export default function DesignNav() {
  const path = usePathname();
  return (
    <nav className={s.dnav} aria-label="Design screens">
      <a href="/design/play" aria-current={path === "/design/play" ? "page" : undefined}>All</a>
      {SCREENS.map((x) => (
        <a key={x.href} href={x.href} aria-current={path === x.href ? "page" : undefined}>{x.name}</a>
      ))}
    </nav>
  );
}
