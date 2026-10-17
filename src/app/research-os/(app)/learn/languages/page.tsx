import type { Metadata } from "next";
import LanguagesHome from "./LanguagesHome";

export const metadata: Metadata = { title: "Languages", robots: { index: false, follow: false } };

export default function LanguagesPage() {
  return <LanguagesHome />;
}
