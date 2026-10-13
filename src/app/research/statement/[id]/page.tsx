import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StatementVariant from "@/components/research-os/StatementVariant";
import { STATEMENT_VARIANTS, findStatementVariant } from "@/lib/research-os/statement-variants";

export const dynamicParams = false;

export function generateStaticParams() {
  return STATEMENT_VARIANTS.map((v) => ({ id: v.id }));
}

export const metadata: Metadata = { title: "Research statement, one screen", robots: { index: false } };

export default function StatementVariantPage({ params }: { params: { id: string } }) {
  const v = findStatementVariant(params.id);
  if (!v) notFound();
  return <StatementVariant v={v} />;
}
