"use client";

import { useState, type MouseEvent } from "react";
import TrackedLink from "@/components/TrackedLink";
import { START_LEARNING_HREF, downloadTarget, trackFunnel } from "@/lib/analytics/funnel";
import DownloadFlowV3 from "@/app/download/DownloadFlowV3";
import type { Os } from "@/lib/download/release";
import type { InstallerV2, WindowedInstaller } from "@/lib/download/release-v2";
import type { DetectedDevice, DeviceLinks } from "@/lib/download/device";
import DevicePicker from "./DevicePicker";
import ProductDemo from "./ProductDemo";
import WebDesktopCompare from "./WebDesktopCompare";
import styles from "./download-demo.module.css";

export default function DownloadExperience({ detected, installers, windowed, device, links }: { detected: Os | null; installers: InstallerV2[]; windowed: WindowedInstaller[]; device: DetectedDevice; links: DeviceLinks }) {
  const [mode, setMode] = useState<"try" | "watch">("try");
  function onDownloadClick(e: MouseEvent<HTMLElement>) {
    const target = downloadTarget(e.target as Element);
    if (target) trackFunnel("download_complete", { target });
  }
  return <main className={styles.page} onClickCapture={onDownloadClick}>
    <section className={styles.heroSingle} aria-label="Download Bucket">
      <div className={styles.heroText}>
        <span className={styles.eyebrow}>Start learning</span>
        <h1>Learn in your browser today.</h1>
        <p data-polingual-line>Polingual language study is inside Bucket: read words across 35 languages by sound, spelling and root.</p>
        <div className="flex flex-col gap-2" data-start-learning>
          <TrackedLink href={START_LEARNING_HREF} event="start_learning_click" from="download_page" className="min-h-[44px] inline-flex items-center justify-center px-6 py-3 rounded-sm bg-[color:var(--gold)] text-[color:var(--basalt)] hover:bg-[color:var(--gold-deep)] hover:text-[color:var(--bone)] small-caps text-[12px] tracking-[0.14em]">Start learning</TrackedLink>
          <p className="text-[13px] text-[color:var(--basalt-2)]">Sign in with an email code, then go straight to Learn.</p>
        </div>
        <h2 className="mt-6 text-[15px] font-semibold">Or download Bucket</h2>
        <DevicePicker detected={device} links={links} />
        <ul className={styles.facts}><li>Works offline</li><li>Signed releases</li><li>Free</li><li>No account needed</li></ul>
      </div>
      <div className={styles.downloadCard} data-download-pane><h2>Release emails, optional</h2><DownloadFlowV3 detected={detected} installers={installers} windowed={windowed} /></div>
    </section>
    <WebDesktopCompare />
    <section className={styles.demoPane} aria-labelledby="demo-heading" data-demo-pane>
      <header className={styles.intro}><div><span className={styles.eyebrow}>See it first</span><h2 id="demo-heading">Follow a question.</h2><p>Start with a coin toss. Follow the math, find a source, and keep what you learn.</p></div><div className={styles.modes} aria-label="Demo format"><button type="button" aria-pressed={mode === "try"} onClick={() => setMode("try")}>Try it ↗</button><button type="button" aria-pressed={mode === "watch"} onClick={() => setMode("watch")}>Watch the desktop ▷</button></div></header>
      <div hidden={mode !== "try"}><ProductDemo /></div>
      {mode === "watch" && <section className={styles.watch} aria-label="Desktop video demo"><video controls playsInline preload="none" poster="/media/bucket-demo-v0.5/poster.webp" aria-label="Bucket desktop tour"><source src="/media/bucket-demo-v0.5/desktop-tour.mp4" type="video/mp4" /><track kind="captions" src="/media/bucket-demo-v0.5/captions.vtt" srcLang="en" label="English" default />Your browser can <a href="/media/bucket-demo-v0.5/desktop-tour.mp4">download the desktop tour</a>.</video><div className={styles.watchText}><h2>A question becomes a workspace.</h2><p>Recorded in Bucket desktop 0.5.0 with a fresh sample library. Follow Explore and Canon search, then visit the learning and data tools.</p><p><a href="/media/bucket-demo-v0.5/transcript.txt">Read the transcript ↗</a></p></div></section>}
    </section>
  </main>;
}
