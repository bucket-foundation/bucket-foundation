import type { Metadata } from "next";
import LearnEntry from "./LearnEntry";

export const metadata: Metadata = { title: "Learn", robots: { index: false, follow: false } };

export default function LearnPage() {
  return <LearnEntry />;
}
