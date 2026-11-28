"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SLIM_FOOTER_PATHS } from "@/lib/routes";

export default function FooterSwitch({ slim, full }: { slim: ReactNode; full: ReactNode }) {
  const pathname = usePathname() || "/";
  return <>{SLIM_FOOTER_PATHS.includes(pathname) ? slim : full}</>;
}
