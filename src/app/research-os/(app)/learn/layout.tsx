import type { ReactNode } from "react";
import AgeGate from "./AgeGate";
import ReviewAuthWatch from "./ReviewAuthWatch";

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ReviewAuthWatch />
      <AgeGate>{children}</AgeGate>
    </>
  );
}
