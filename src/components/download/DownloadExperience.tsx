"use client";

import { useState } from "react";
import DownloadFlowV3 from "@/app/download/DownloadFlowV3";
import type { Os } from "@/lib/download/release";
import type { InstallerV2, WindowedInstaller } from "@/lib/download/release-v2";
import ProductDemo from "./ProductDemo";
import WebDesktopCompare from "./WebDesktopCompare";
import styles from "./download-demo.module.css";

export default function DownloadExperience({ detected, installers, windowed }: { detected: Os | null; installers: InstallerV2[]; windowed: WindowedInstaller[] }) {
  const [mode, setMode] = useState<"try" | "watch">("try");
  return <main className={styles.page}>
    <section className={styles.hero} aria-label="Download Bucket">
      <div className={styles.heroText}>
        <span className={styles.eyebrow}>Download · Bucket desktop</span>
        <h1>Bucket on your computer.</h1>
        <p>Follow a question from a coin toss to the math and the sources, and keep what you learn. The desktop app runs offline, and every release is signed.</p>
        <ul className={styles.facts}><li>Mac, Windows and Linux</li><li>Works offline</li><li>Signed releases</li><li>Free</li></ul>
      </div>
      <div className={styles.downloadCard} data-download-pane><h2>Get the app</h2><DownloadFlowV3 detected={detected} installers={installers} windowed={windowed} /></div>
    </section>
    <WebDesktopCompare />
    <section className={styles.demoPane} aria-labelledby="demo-heading" data-demo-pane>
      <header className={styles.intro}><div><span className={styles.eyebrow}>See it first</span><h2 id="demo-heading">Follow a question.</h2><p>Start with a coin toss. Follow the math, find a source, and keep what you learn.</p></div><div className={styles.modes} aria-label="Demo format"><button type="button" aria-pressed={mode === "try"} onClick={() => setMode("try")}>Try it ↗</button><button type="button" aria-pressed={mode === "watch"} onClick={() => setMode("watch")}>Watch the desktop ▷</button></div></header>
      <div hidden={mode !== "try"}><ProductDemo /></div>
      {mode === "watch" && <section className={styles.watch} aria-label="Desktop video demo"><video controls playsInline preload="none" poster="/media/bucket-demo-v0.5/poster.webp" aria-label="Bucket desktop tour"><source src="/media/bucket-demo-v0.5/desktop-tour.mp4" type="video/mp4" /><track kind="captions" src="/media/bucket-demo-v0.5/captions.vtt" srcLang="en" label="English" default />Your browser can <a href="/media/bucket-demo-v0.5/desktop-tour.mp4">download the desktop tour</a>.</video><div className={styles.watchText}><h2>A question becomes a workspace.</h2><p>Recorded in Bucket desktop 0.5.0 with a fresh sample library. Follow Explore and Canon search, then visit the learning and data tools.</p><p><a href="/media/bucket-demo-v0.5/transcript.txt">Read the transcript ↗</a></p></div></section>}
    </section>
  </main>;
}
