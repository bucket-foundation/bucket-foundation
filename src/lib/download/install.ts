import type { Os } from "./release";

const RAW = "https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts";
const RAW_AT = (ref: string) => `https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/${ref}/scripts`;

export const INSTALL_COMMAND: Record<Os, string> = {
  macos: `curl -fsSL ${RAW}/install.sh | sh`,
  linux: `curl -fsSL ${RAW}/install.sh | sh`,
  windows: `irm ${RAW}/install.ps1 | iex`,
};

export type Distro = "fedora" | "ubuntu" | "debian" | "arch" | "opensuse";

export const DISTRO_LABEL: Record<Distro, string> = { fedora: "Fedora", ubuntu: "Ubuntu", debian: "Debian", arch: "Arch", opensuse: "openSUSE" };

export function detectLinuxDistro(ua: string | null | undefined): Distro | null {
  const s = ua ?? "";
  if (/Fedora/i.test(s)) return "fedora";
  if (/Ubuntu/i.test(s)) return "ubuntu";
  if (/Debian/i.test(s)) return "debian";
  if (/\bArch\b/i.test(s) && /Linux/i.test(s)) return "arch";
  if (/SUSE/i.test(s)) return "opensuse";
  return null;
}

const RELEASE_TAG = /^bkt-v\d+\.\d+\.\d+$/;

const RELEASE_TAG_IN_URL = /\/releases\/download\/(bkt-v\d+\.\d+\.\d+)\/[A-Za-z0-9._-]+$/;

export function releaseTagOf(appImageUrl: string): string | null {
  return RELEASE_TAG_IN_URL.exec(appImageUrl)?.[1] ?? null;
}

export function linuxInstallCommand(appImageUrl: string | null, releaseTag: string | null = null): string {
  const tag = appImageUrl ? releaseTagOf(appImageUrl) : null;
  if (!appImageUrl || !tag) return releaseTag && RELEASE_TAG.test(releaseTag) ? `curl -fsSL '${RAW_AT(releaseTag)}/install.sh' | BKT_VERSION=${releaseTag} sh` : INSTALL_COMMAND.linux;
  return `curl -fsSL '${RAW_AT(tag)}/release/install.sh' | bash -s -- '${appImageUrl}'`;
}

export function releaseTagFrom(urls: string[]): string | null {
  for (const u of urls) {
    const tag = releaseTagOf(u);
    if (tag) return tag;
  }
  return null;
}

export function executableStep(distro: Distro | null): string {
  const base = "In your file manager, right-click the file, open Properties, then Permissions, and tick Executable as Program before you open it.";
  return distro ? `${DISTRO_LABEL[distro]}: ${base}` : base;
}

export const APPIMAGE_RUN_STEPS = ["chmod +x Bucket-*.AppImage", "./Bucket-*.AppImage"] as const;

export const CD_DOWNLOADS = `cd "$(xdg-user-dir DOWNLOAD 2>/dev/null || echo "$HOME/Downloads")"`;

export function appImageRunSteps(name: string): string {
  if (name.endsWith(".tar.gz")) {
    const inner = name.slice(0, -".tar.gz".length);
    return `${CD_DOWNLOADS}\ntar -xzf ./${name}\n./${inner}`;
  }
  return `${CD_DOWNLOADS}\nchmod +x ./${name}\n./${name}`;
}

export function packageInstallCommand(format: "deb" | "rpm", name: string): string {
  return `${CD_DOWNLOADS}\n${format === "deb" ? "sudo apt install" : "sudo dnf install"} ./${name}`;
}

export const LINUX_INSTALL_NOTE = "Verifies the file, then installs Bucket to your app menu.";

export const LINUX_PACKAGE_LABEL: Record<"deb" | "rpm", string> = { deb: "Download the .deb, Debian and Ubuntu", rpm: "Download the .rpm, Fedora and openSUSE" };

export const DIRECT_FILE_SUMMARY = "Direct file";

export const DIRECT_FILE_STEP = "The archive keeps the AppImage runnable. Run these two lines after it downloads.";

export const DIRECT_FILE_STEP_RAW = "The AppImage arrives without permission to run. Run these two lines after it downloads.";

export const APPIMAGE_WARNING = "Open the AppImage from a terminal. Opening it with Disks offers to overwrite your whole drive.";

export const APPIMAGE_WARNING_SHORT = "Open it from a terminal, never with Disks.";

export const INSTALL_SHELL: Record<Os, string> = { macos: "Terminal", linux: "a terminal", windows: "PowerShell" };

export const FIRST_OPEN: Partial<Record<Os, { summary: string; steps: string }>> = {
  macos: { summary: "First open on macOS", steps: "This build has no Apple signature. Open Bucket once, then choose Open Anyway under System Settings, Privacy & Security." },
  windows: { summary: "First open on Windows", steps: "This build has no publisher signature. When SmartScreen appears, choose More info, then Run anyway." },
};
