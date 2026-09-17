import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Research OS",
  description: "Today in Research OS: your level, your path on the graph, and what to continue.",
  robots: { index: false, follow: false },
};

export default function ResearchOsHomePage() {
  return <HomeClient />;
}
