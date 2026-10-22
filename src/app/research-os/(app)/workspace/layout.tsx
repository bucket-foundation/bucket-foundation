import type { ReactNode } from "react";
import { gateLaunchPage } from "@/lib/research-os/launch-page";
import WorkspaceTabBar from "./WorkspaceTabBar";

export default async function StaffAtLaunchLayout({ children }: { children: ReactNode }) {
  await gateLaunchPage("/research-os/workspace");
  return (
    <>
      <WorkspaceTabBar />
      {children}
    </>
  );
}
