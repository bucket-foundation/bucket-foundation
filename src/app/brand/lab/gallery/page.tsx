import type { Metadata } from "next";
import { notFound } from "next/navigation";
import kit from "../../../../../brand/bucket/kit.json";
import candidates from "../../../../../brand/bucket/candidates.json";
import Gallery from "./Gallery";

export const metadata: Metadata = { title: "Brand Gallery", robots: { index: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery kit={kit} palettes={candidates.palettes} auto={candidates.auto} logos={candidates.logos} />;
}
