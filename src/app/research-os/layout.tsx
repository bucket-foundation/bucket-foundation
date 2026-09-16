import type { ReactNode } from "react";
import ResearchOsNav from "./ResearchOsNav";

// Research OS shell: the module bar under the site header, then the page.
// Pages keep their own <main>; the landing page's fixed globe sits under
// the bar (z-[1] against the bar's z-10).
export default function ResearchOsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ResearchOsNav />
      {children}
    </>
  );
}
