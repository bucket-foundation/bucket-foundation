"use client";

import { Button } from "@/ui";

export default function PrintButton({ label }: { label: string }) {
  return <Button variant="secondary" size="md" onClick={() => window.print()} data-testid="print">{label}</Button>;
}
