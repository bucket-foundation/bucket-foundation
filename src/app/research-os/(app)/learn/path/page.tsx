import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import PathView from "./PathView";

export const metadata: Metadata = { title: "Learning path", robots: { index: false, follow: false } };

export default function LearnPathPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading the prerequisite graph" />}>
      <PathView />
    </Suspense>
  );
}
