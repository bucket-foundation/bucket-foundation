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

const RELEASE_TAG_IN_URL = /\/releases\/download\/(bkt-v\d+\.\d+\.\d+)\/[A-Za-z0-9._-]+$/;

export function releaseTagOf(appImageUrl: string): string | null {
  return RELEASE_TAG_IN_URL.exec(appImageUrl)?.[1] ?? null;
}

export function linuxInstallCommand(appImageUrl: string | null): string {
  const tag = appImageUrl ? releaseTagOf(appImageUrl) : null;
  if (!appImageUrl || !tag) return INSTALL_COMMAND.linux;
  return `curl -fsSL '${RAW_AT(tag)}/release/install.sh' | bash -s -- '${appImageUrl}'`;
}

export function executableStep(distro: Distro | null): string {
  const base = "In your file manager, right-click the file, open Properties, then Permissions, and tick Executable as Program before you open it.";
  return distro ? `${DISTRO_LABEL[distro]}: ${base}` : base;
}

export const APPIMAGE_RUN_STEPS = ["chmod +x Bucket-*.AppImage", "./Bucket-*.AppImage"] as const;

export const APPIMAGE_WARNING = "Open the AppImage from a terminal. Opening it with Disks offers to overwrite your whole drive.";

export const APPIMAGE_WARNING_SHORT = "Open it from a terminal, never with Disks.";

export const INSTALL_SHELL: Record<Os, string> = { macos: "Terminal", linux: "a terminal", windows: "PowerShell" };
