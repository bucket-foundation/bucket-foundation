import type { Metadata } from "next";
import ProductionsList from "./ProductionsList";

export const metadata: Metadata = { title: "Productions", robots: { index: false, follow: false } };

export default function ProductionsPage() {
  return <ProductionsList />;
}
