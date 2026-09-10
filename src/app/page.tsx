import type { Metadata } from "next";
import Presentation from "@/components/Presentation";

export const metadata: Metadata = {
  title: "bucket.foundation: reform education",
  description:
    "Bucket is the operating system a student runs inside from the first year of school to the research frontier, on a nonprofit canon of foundations: axioms, laws, first principles, free to read and paid to cite over feed402/x402 on Base.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation",
    title: "bucket.foundation: reform education",
    description: "build the past. build history. bucket is the new renaissance.",
  },
};

export default function Home() {
  return (
    <main>
      <Presentation />
    </main>
  );
}
