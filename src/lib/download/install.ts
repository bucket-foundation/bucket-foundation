import type { Os } from "./release";

const RAW = "https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts";

export const INSTALL_COMMAND: Record<Os, string> = {
  macos: `curl -fsSL ${RAW}/install.sh | sh`,
  linux: `curl -fsSL ${RAW}/install.sh | sh`,
  windows: `irm ${RAW}/install.ps1 | iex`,
};

export const APPIMAGE_RUN_STEPS = ["chmod +x Bucket-*.AppImage", "./Bucket-*.AppImage"] as const;

export const APPIMAGE_WARNING = "Open the AppImage from a terminal. Opening it with Disks offers to overwrite your whole drive.";

export const INSTALL_SHELL: Record<Os, string> = { macos: "Terminal", linux: "a terminal", windows: "PowerShell" };
