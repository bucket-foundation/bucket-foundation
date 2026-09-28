import type { ReactNode } from "react";
import AgeGate from "./AgeGate";

export default function LearnLayout({ children }: { children: ReactNode }) {
  return <AgeGate>{children}</AgeGate>;
}
