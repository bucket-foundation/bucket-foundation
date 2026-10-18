import { RELEASES_PAGE } from "./release";
import { directFiles, type WindowedInstaller } from "./release-v2";

export const DEVICES = ["ios", "android", "macos-arm64", "macos-x64", "windows", "linux", "linux-arm64", "web"] as const;
export type DetectedDevice = Device | "macos";
export type Device = (typeof DEVICES)[number];

export const DEVICE_LABEL: Record<Device, string> = {
  ios: "iPhone and iPad",
  android: "Android",
  "macos-arm64": "Mac, Apple silicon",
  "macos-x64": "Mac, Intel",
  windows: "Windows",
  linux: "Linux",
  "linux-arm64": "Linux, ARM",
  web: "Web",
};

export const LEARN_PATH = "/learn";

export function detectDevice(ua: string | null | undefined, archHint: string | null | undefined = null): DetectedDevice {
  const s = ua ?? "";
  if (/iPhone|iPad|iPod/i.test(s)) return "ios";
  if (/Android/i.test(s)) return "android";
  if (/Windows/i.test(s)) return "windows";
  const arch = (archHint ?? "").replace(/"/g, "").toLowerCase();
  if (/Macintosh|Mac OS X/i.test(s)) return arch === "x86" ? "macos-x64" : arch === "arm" ? "macos-arm64" : "macos";
  if (/CrOS/i.test(s)) return "web";
  if (/Linux|X11/i.test(s)) return arch === "arm" ? "linux-arm64" : "linux";
  return "web";
}

export interface DeviceLink {
  device: Device;
  label: string;
  href: string | null;
  action: string;
}

export interface DeviceSources {
  windowed: WindowedInstaller[];
  apk: string | null;
  testflight: string | null;
}

function desktop(windowed: WindowedInstaller[], os: WindowedInstaller["os"], arch: WindowedInstaller["arch"]): string | null {
  const mine = windowed.filter((w) => w.os === os && w.arch === arch);
  const pick = os === "linux" ? directFiles(mine)[0] ?? mine[0] : mine[0];
  return pick?.url ?? null;
}

const DESKTOP_TARGET: Record<"macos-arm64" | "macos-x64" | "windows" | "linux" | "linux-arm64", [WindowedInstaller["os"], WindowedInstaller["arch"]]> = {
  "macos-arm64": ["macos", "arm64"],
  "macos-x64": ["macos", "x64"],
  windows: ["windows", "x64"],
  linux: ["linux", "x64"],
  "linux-arm64": ["linux", "arm64"],
};

export function linkFor(device: Device, src: DeviceSources): DeviceLink {
  const label = DEVICE_LABEL[device];
  if (device === "ios") return src.testflight ? { device, label, href: src.testflight, action: "Join the TestFlight beta" } : { device, label, href: null, action: "Coming soon" };
  if (device === "android") return src.apk ? { device, label, href: src.apk, action: "Download the Android app" } : { device, label, href: null, action: "Coming soon" };
  if (device === "web") return { device, label, href: LEARN_PATH, action: "Open Bucket in your browser" };
  const href = desktop(src.windowed, ...DESKTOP_TARGET[device]);
  return href ? { device, label, href, action: `Download for ${label}` } : { device, label, href: RELEASES_PAGE, action: "See all releases" };
}

export interface DeviceChoice {
  primary: DeviceLink[];
  others: DeviceLink[];
}

export function deviceLinks(detected: DetectedDevice, src: DeviceSources): DeviceChoice {
  const first: Device[] = detected === "macos" ? ["macos-arm64", "macos-x64"] : [detected];
  return { primary: first.map((d) => linkFor(d, src)), others: DEVICES.filter((d) => !first.includes(d)).map((d) => linkFor(d, src)) };
}

export function testflightUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return /^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]+$/.test(v) ? v : null;
}
