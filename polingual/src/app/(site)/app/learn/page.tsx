"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { appHref } from "@/lib/app/systems";
import { Stage } from "@/ui";
import { useSystems } from "../useSystems";
import styles from "../app.module.css";

export default function LearnPage() {
  const router = useRouter();
  const { state } = useSystems();
  useEffect(() => {
    if (state.status !== "ready") return;
    router.replace(state.systems[0] ? appHref.study(state.systems[0].id) : appHref.create);
  }, [state, router]);
  return (
    <Stage ground="paper" strip={false}>
      <p className={styles.muted} aria-busy="true">{state.status === "error" ? "Your languages did not load. Reload the page to try again." : "Opening today's session"}</p>
    </Stage>
  );
}
