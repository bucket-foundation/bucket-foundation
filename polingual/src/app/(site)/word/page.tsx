import type { Metadata } from "next";
import { WordIndexView } from "./views";
import { wordIndexMeta } from "@/lib/word-meta";

export const metadata: Metadata = wordIndexMeta("en");

export default function Page() {
  return <WordIndexView code="en" />;
}
