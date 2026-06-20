"use client";

// ToolOfflineNotice — the friendly "founder's GPU is offline" state.
//
// Several advanced tools run on the founder's personal laptop GPU (a local LLM
// + GPU jobs) reached over a tunnel; when his laptop is closed the upstream is
// unreachable and the same-origin proxy returns a 503 "tool_offline" envelope.
// Rather than show a raw error, the affected tools render this block: an honest
// explanation, a CONTACT email button, and a DONATE/FUND button → /support.
//
// Use detectToolOffline(status, errorMsg) to decide whether to show it.

import Link from "next/link";
import { TOOL_OFFLINE_MAILTO } from "@/lib/support";

/**
 * Is this error the "founder GPU is offline" case rather than a normal failure?
 * The proxy returns HTTP 503 with code "tool_offline" / "service_unavailable"
 * (or a 502/504 when the tunnel is down). We also match the offline message.
 */
export function detectToolOffline(status: number | null, msg: string): boolean {
  if (status === 503 || status === 502 || status === 504) return true;
  const m = (msg || "").toLowerCase();
  return (
    m.includes("offline") ||
    m.includes("could not reach") ||
    m.includes("lost connection") ||
    m.includes("not reachable") ||
    m.includes("tool_offline")
  );
}

export function ToolOfflineNotice({ toolName }: { toolName?: string }) {
  return (
    <div className="mt-8 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[color:var(--gold-deep,var(--basalt-3))]" />
        <div className="small-caps tracking-[0.16em] text-[color:var(--basalt-3)]">
          running on a personal GPU · offline right now
        </div>
      </div>
      <p className="text-[15px] leading-[1.8] text-[color:var(--basalt)]">
        {toolName ? `${toolName} ` : "This tool "}
        runs on the founder&rsquo;s personal GPU (gianyrox&rsquo;s laptop), which
        is offline right now. The always-on tools on Bucket keep working — but
        the GPU / local-LLM features only run while that machine is open.
      </p>
      <p className="mt-3 text-[14px] leading-[1.75] text-[color:var(--basalt-2)]">
        To get this always-on for everyone, 24/7, the foundation needs
        cloud-GPU hosting. You can fund it or reach out below.
      </p>

      <div className="carved-rule max-w-xs mt-7 mb-6" />

      <div className="flex flex-wrap items-center gap-4">
        <a
          href={TOOL_OFFLINE_MAILTO}
          className="font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
        >
          contact →
        </a>
        <Link
          href="/support"
          className="font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          fund always-on hosting →
        </Link>
      </div>
    </div>
  );
}
