import type { Metadata } from "next";
import Presentation from "@/components/Presentation";

export const metadata: Metadata = {
  title: "bucket.foundation — free to read. paid to cite.",
  description:
    "build the past. build history. bucket is the new renaissance. A nonprofit canon of foundations — axioms, laws, first principles — free to read, paid to cite, over feed402/x402 on Base.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation",
    title: "bucket.foundation — free to read. paid to cite.",
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
