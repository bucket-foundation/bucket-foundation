import type { ReactNode } from "react";

export default function Sources({ children }: { children: ReactNode }) {
  return (
    <footer
      data-sources
      className="mt-20 border-t border-[color:var(--hairline)] pt-8 text-sm"
      style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
    >
      {children}
    </footer>
  );
}
