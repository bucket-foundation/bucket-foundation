"use client";

import { useEffect, useState } from "react";
import styles from "./brand.module.css";

export default function SectionNav({ sections }: { sections: readonly (readonly [string, string])[] }) {
  const [active, setActive] = useState(sections[0][0]);
  useEffect(() => {
    const els = sections.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: "-20% 0px -70% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);
  return (
    <nav className={styles.nav} aria-label="Brand sections">
      <ol>
        {sections.map(([id, name], i) => (
          <li key={id}>
            <a href={`#${id}`} aria-current={active === id ? "location" : undefined}>
              <span>{String(i + 1).padStart(2, "0")}</span>{name}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
