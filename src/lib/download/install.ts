import type { Os } from "./release";

const RAW = "https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts";

export const INSTALL_COMMAND: Record<Os, string> = {
  macos: `curl -fsSL ${RAW}/install.sh | sh`,
  linux: `curl -fsSL ${RAW}/install.sh | sh`,
  windows: `irm ${RAW}/install.ps1 | iex`,
};

export const LINUX_INSTALL_SCRIPT = `${RAW}/release/install.sh`;

export type Distro = "fedora" | "ubuntu" | "debian" | "arch" | "opensuse";

export const DISTRO_LABEL: Record<Distro, string> = { fedora: "Fedora", ubuntu: "Ubuntu", debian: "Debian", arch: "Arch", opensuse: "openSUSE" };

export function detectLinuxDistro(ua: string | null | undefined): Distro | null {
  const s = ua ?? "";
  if (/Fedora/i.test(s)) return "fedora";
  if (/Ubuntu/i.test(s)) return "ubuntu";
  if (/Debian/i.test(s)) return "debian";
  if (/Arch/i.test(s) && /Linux/i.test(s)) return "arch";
  if (/SUSE/i.test(s)) return "opensuse";
  return null;
}

export function linuxInstallCommand(appImageUrl: string | null): string {
  return appImageUrl ? `curl -fsSL ${LINUX_INSTALL_SCRIPT} | bash -s -- ${appImageUrl}` : INSTALL_COMMAND.linux;
}

export function executableStep(distro: Distro | null): string {
  const base = "In your file manager, right-click the file, open Properties, then Permissions, and tick Executable as Program before you open it.";
  return distro ? `${DISTRO_LABEL[distro]}: ${base}` : base;
}

export const APPIMAGE_RUN_STEPS = ["chmod +x Bucket-*.AppImage", "./Bucket-*.AppImage"] as const;

export const APPIMAGE_WARNING = "Open the AppImage from a terminal. Opening it with Disks offers to overwrite your whole drive.";

export const INSTALL_SHELL: Record<Os, string> = { macos: "Terminal", linux: "a terminal", windows: "PowerShell" };
