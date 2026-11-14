import type { Metadata } from "next";
import { buildBank } from "@/lib/polyword/bank";
import { WORDS } from "@/lib/words";
import Polyword from "./Polyword";

export const metadata: Metadata = {
  title: "Polyword",
  description: "One word a day in the language you are learning. Six guesses, and every miss shows the meaning in another language.",
  robots: { index: true },
};

const BANK = buildBank(WORDS);

export default function PolywordPage() {
  return <Polyword bank={BANK} />;
}
