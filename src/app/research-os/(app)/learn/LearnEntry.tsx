"use client";

import { useAccountGate } from "@/lib/academy/account-gate-context";
import LanguagesHome from "./languages/LanguagesHome";
import LearnHome from "./LearnHome";

export default function LearnEntry() {
  const { guest } = useAccountGate();
  if (!guest) return <LearnHome />;
  return (
    <div className="flex flex-col gap-12" data-guest-learn>
      <LanguagesHome />
      <LearnHome />
    </div>
  );
}
