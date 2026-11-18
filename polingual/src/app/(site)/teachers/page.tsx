import type { Metadata } from "next";
import { teachersMeta } from "@/lib/teachers-meta";
import { TeachersView } from "./views";

export const metadata: Metadata = teachersMeta("en", "");

export default function Page() {
  return <TeachersView lang="en" />;
}
