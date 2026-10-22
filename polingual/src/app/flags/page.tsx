import type { Metadata } from "next";
import FlagGallery from "../../../../src/components/flags/FlagGallery";

export const metadata: Metadata = {
  title: "Flag atelier · polingual",
  description:
    "Country flags, made tangible. Explore country and territory tiles with frames inspired by regional craft traditions.",
  alternates: { canonical: "/flags" },
};

export default function FlagsPage() {
  return <FlagGallery product="polingual" />;
}
