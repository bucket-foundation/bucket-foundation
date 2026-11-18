import type { Metadata } from "next";
import { teachersMeta } from "@/lib/teachers-meta";
import { HandoutView } from "../views";

export const metadata: Metadata = teachersMeta("en", "/handout");

export default function Page() {
  return <HandoutView lang="en" />;
}
