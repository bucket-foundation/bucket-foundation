import type { Metadata } from "next";
import { teachersMeta } from "@/lib/teachers-meta";
import { LessonPlanView } from "../views";

export const metadata: Metadata = teachersMeta("en", "/lesson-plan");

export default function Page() {
  return <LessonPlanView lang="en" />;
}
