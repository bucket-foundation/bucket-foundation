"use client";

import NewSystem from "../NewSystem";
import { useSystems } from "../useSystems";
import styles from "../app.module.css";

export default function NewSystemPage() {
  const { state, create } = useSystems();
  if (state.status === "loading") return <p className={styles.muted} aria-busy="true">Loading your languages</p>;
  return <NewSystem systems={state.status === "ready" ? state.systems : []} create={create} />;
}
