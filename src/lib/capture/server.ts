import { track } from "@vercel/analytics/server";
import { CAPTURE_MAX_PER_WINDOW, CAPTURE_WINDOW_MS } from "./core";
import { handleCapture, layeredLimiter, type CaptureResult } from "./handler";
import { analyticsLeg, slackLeg, vercelDefer } from "./legs";
import { rateLimiter } from "../download/handler";
import { getMarkStore, sharedRateLimiter } from "../download/marks";
import { notifierConfig, resendNotifier } from "../download/notify";
import { getWaitlistStore } from "../waitlist/store";

const localLimited = rateLimiter(CAPTURE_MAX_PER_WINDOW, CAPTURE_WINDOW_MS);

export async function captureRequest(body: unknown, ip: string): Promise<CaptureResult> {
  const marks = getMarkStore();
  const config = notifierConfig();
  if (!config) console.error("[capture] RESEND_API_KEY, DOWNLOAD_LINK_SECRET or DOWNLOAD_ARTIFACT_BLOB unset; download signups stored without email");
  return handleCapture(body, ip, {
    store: (part) => getWaitlistStore(process.env, part),
    limited: layeredLimiter(localLimited, marks ? sharedRateLimiter(marks, CAPTURE_MAX_PER_WINDOW, CAPTURE_WINDOW_MS) : undefined),
    notify: config && marks ? resendNotifier(config, marks) : undefined,
    analytics: analyticsLeg(process.env, track),
    slack: slackLeg(process.env),
    defer: vercelDefer,
  });
}
