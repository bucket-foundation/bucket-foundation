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

export const LEARN_PATH = "/research-os/learn";

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

const PLATFORM_UA: Record<string, string> = {
  macos: "Macintosh",
  windows: "Windows",
  linux: "X11; Linux",
  android: "Android",
  "chrome os": "CrOS",
  ios: "iPhone",
};

export function detectFromHints(ua: string | null | undefined, platform: string | null | undefined, archHint: string | null | undefined = null): DetectedDevice {
  const known = PLATFORM_UA[(platform ?? "").replace(/"/g, "").trim().toLowerCase()];
  return detectDevice(known ?? ua, archHint);
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

const OS_NAME: Record<Device, string> = {
  ios: "iPhone",
  android: "Android",
  "macos-arm64": "Mac",
  "macos-x64": "Intel Mac",
  windows: "Windows",
  linux: "Linux",
  "linux-arm64": "Linux ARM",
  web: "your browser",
};

export function linkFor(device: Device, src: DeviceSources): DeviceLink {
  const label = DEVICE_LABEL[device];
  if (device === "ios") return src.testflight ? { device, label, href: src.testflight, action: "Get Bucket for iPhone on TestFlight" } : { device, label, href: null, action: "Bucket for iPhone is coming soon" };
  if (device === "android") return src.apk ? { device, label, href: src.apk, action: "Download Bucket for Android" } : { device, label, href: null, action: "Bucket for Android is coming soon" };
  if (device === "web") return { device, label, href: LEARN_PATH, action: "Open Bucket in your browser" };
  const href = desktop(src.windowed, ...DESKTOP_TARGET[device]);
  return href ? { device, label, href, action: `Download Bucket for ${OS_NAME[device]}` } : { device, label, href: RELEASES_PAGE, action: `Download Bucket for ${OS_NAME[device]}` };
}

export type DeviceLinks = Record<Device, DeviceLink>;

export function allLinks(src: DeviceSources): DeviceLinks {
  return Object.fromEntries(DEVICES.map((d) => [d, linkFor(d, src)])) as DeviceLinks;
}

export interface DeviceChoice {
  primary: DeviceLink;
  alt: DeviceLink | null;
  others: DeviceLink[];
}

export function deviceLinks(detected: DetectedDevice, links: DeviceLinks): DeviceChoice {
  const main: Device = detected === "macos" ? "macos-arm64" : detected;
  const alt = detected === "macos" ? links["macos-x64"] : null;
  return { primary: links[main], alt, others: DEVICES.filter((d) => d !== main && d !== alt?.device).map((d) => links[d]) };
}

export function testflightUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return /^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]+$/.test(v) ? v : null;
}
