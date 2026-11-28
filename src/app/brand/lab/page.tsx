import type { Metadata } from "next";
import { notFound } from "next/navigation";
import kit from "../../../../brand/bucket/kit.json";
import candidates from "../../../../brand/bucket/candidates.json";
import BrandLab from "./BrandLab";

export const metadata: Metadata = { title: "Brand Lab", robots: { index: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BrandLab kit={kit} palettes={candidates.palettes} logos={candidates.logos} />;
}
