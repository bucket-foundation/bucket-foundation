"use client";

import type { MouseEvent } from "react";
import { downloadTarget, trackFunnel } from "@/lib/analytics/funnel";
import type { DetectedDevice, DeviceLinks } from "@/lib/download/device";
import DevicePicker from "./DevicePicker";

export default function DownloadExperience({ device, links }: { device: DetectedDevice; links: DeviceLinks }) {
  function onDownloadClick(e: MouseEvent<HTMLElement>) {
    const target = downloadTarget(e.target as Element);
    if (target) trackFunnel("download_complete", { target });
  }
  return (
    <main data-download-page className="stone-bone min-h-[calc(100svh-62px-77px)] flex items-center justify-center px-4" onClickCapture={onDownloadClick}>
      <section aria-label="Download Bucket" className="w-full max-w-md py-20 text-center">
        <h1 className="font-display uppercase text-[clamp(2rem,7vw,3.25rem)] leading-[1.05] chisel text-[color:var(--basalt)]">Download Bucket</h1>
        <p data-polingual-line className="mt-5 text-[16px] leading-[1.55] text-[color:var(--basalt-2)]">Free, signed and works offline. Polingual language study is inside.</p>
        <div className="mt-10 [&_ul]:justify-center">
          <DevicePicker detected={device} links={links} />
        </div>
      </section>
    </main>
  );
}
