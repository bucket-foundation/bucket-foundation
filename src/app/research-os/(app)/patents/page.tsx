import type { Metadata } from "next";
import data from "@/lib/research-os/patents-design-data.json";
import type { PatentsDesign } from "@/lib/research-os/patents-design";
import { PatentsView } from "@/components/research-os/views/PatentsView";

export const metadata: Metadata = { title: "Patents", robots: { index: false, follow: false } };

export default function PatentsPage() {
  return <PatentsView design={data as PatentsDesign} />;
}
