import type { ReactNode } from "react";
import { gateLaunchPage } from "@/lib/research-os/launch-page";

export default async function StaffAtLaunchLayout({ children }: { children: ReactNode }) {
  await gateLaunchPage("/research-os/review");
  return children;
}
