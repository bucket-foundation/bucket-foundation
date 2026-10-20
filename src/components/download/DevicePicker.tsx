"use client";

import { useEffect, useState } from "react";
import { detectFromHints, deviceLinks, type DetectedDevice, type DeviceLinks } from "@/lib/download/device";

const PRIMARY =
  "w-full px-5 py-4 text-[16px] font-semibold bg-[color:var(--gold)] text-[color:var(--basalt)] min-h-[52px] flex items-center justify-center text-center";
const PRIMARY_OFF =
  "w-full px-5 py-4 text-[15px] border border-[color:var(--hairline)] text-[color:var(--basalt-2)] min-h-[52px] flex items-center justify-center text-center";
const SMALL = "underline text-[13px] text-[color:var(--basalt-2)] min-h-[44px] inline-flex items-center";

type Hints = { platform?: string; getHighEntropyValues?: (keys: string[]) => Promise<{ architecture?: string }> };

export default function DevicePicker({ detected, links }: { detected: DetectedDevice; links: DeviceLinks }) {
  const [device, setDevice] = useState<DetectedDevice>(detected);

  useEffect(() => {
    const hints = (navigator as Navigator & { userAgentData?: Hints }).userAgentData;
    setDevice(detectFromHints(navigator.userAgent, hints?.platform, null));
    hints?.getHighEntropyValues?.(["architecture"]).then((v) => setDevice(detectFromHints(navigator.userAgent, hints.platform, v.architecture ?? null))).catch(() => undefined);
  }, []);

  const { primary, alt, others } = deviceLinks(device, links);
  return (
    <div className="flex flex-col gap-3" data-device-picker data-detected={device}>
      {primary.href ? (
        <a href={primary.href} className={PRIMARY} data-device-primary={primary.device}>{primary.action}</a>
      ) : (
        <>
          <span aria-disabled="true" className={PRIMARY_OFF} data-device-primary={primary.device}>{primary.action}</span>
          <a href={links.web.href ?? "/learn"} className={PRIMARY} data-device-fallback="web">{links.web.action}</a>
        </>
      )}
      {alt?.href && <p className="text-[13px] text-[color:var(--basalt-2)]" data-device-alt={alt.device}>Built for Apple silicon. Apple menu, About This Mac shows your chip. Intel chip? <a href={alt.href} className="underline">Download the Intel build</a>.</p>}
      <ul className="flex flex-wrap gap-x-4" aria-label="Other platforms">
        {others.map((l) => (
          <li key={l.device} data-device-other={l.device}>
            {l.href ? <a href={l.href} className={SMALL}>{l.label}</a> : <span className="text-[13px] text-[color:var(--basalt-3)] min-h-[44px] inline-flex items-center">{l.label}, soon</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
