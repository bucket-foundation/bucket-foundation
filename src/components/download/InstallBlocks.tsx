import CopyBlock from "../CopyBlock";
import { APPIMAGE_RUN_STEPS, APPIMAGE_WARNING, INSTALL_COMMAND, INSTALL_SHELL } from "../../lib/download/install";
import { OSES, OS_LABEL, megabytes, type Os } from "../../lib/download/release";
import { hasDesktop, preferArch, type Arch, type InstallerV2 } from "../../lib/download/release-v2";

const SECONDARY =
  "flex items-center justify-between gap-3 px-6 py-3 min-h-[44px] border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold-deep)] transition small-caps text-[11px] tracking-[0.14em]";

const ARCH_LABEL: Record<string, string> = { "macos/arm64": "Apple silicon", "macos/x64": "Intel", "linux/arm64": "ARM", "linux/x64": "x86_64", "windows/x64": "x64" };

export function osOrder(os: Os | null): Os[] {
  return [...OSES].sort((a, b) => Number(b === os) - Number(a === os));
}

function directLabel(i: InstallerV2): string {
  const arch = ARCH_LABEL[`${i.os}/${i.arch}`];
  if (i.kind === "terminal") return `or download the bkt terminal app, ${arch}`;
  return i.os === "linux" ? "or download the AppImage" : `or download the ${OS_LABEL[i.os]} installer, ${arch}`;
}

export default function InstallBlocks({ os, arch = null, installers }: { os: Os | null; arch?: Arch | null; installers: InstallerV2[] }) {
  return (
    <div className="flex flex-col gap-8" data-install-blocks>
      {osOrder(os).map((o) => {
        const mine = preferArch(installers.filter((i) => i.os === o), arch);
        const appImage = mine.find((i) => i.os === "linux" && /\.AppImage$/i.test(i.name));
        return (
          <div key={o} data-os={o} className="flex flex-col gap-3">
            <h3 className={o === os ? "small-caps text-[12px] tracking-[0.14em] text-[color:var(--aegean-deep)]" : "small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)]"}>
              {OS_LABEL[o]}
            </h3>
            <p className="text-[13px] text-[color:var(--basalt-2)]">Paste this into {INSTALL_SHELL[o]}. It installs the bkt terminal app and checks the signature first.</p>
            <CopyBlock text={INSTALL_COMMAND[o]} label={`${OS_LABEL[o]} install command`} />
            {mine.map((i) => (
              <div key={i.name} className="flex flex-col gap-1">
                <a href={i.url} className={SECONDARY} data-direct={o} data-kind={i.kind}>
                  <span>{directLabel(i)}</span>
                  <span className="normal-case tracking-normal text-[12px] opacity-80">{megabytes(i.size)}</span>
                </a>
                {i.checksumUrl && (
                  <a href={i.checksumUrl} className="text-[12px] underline text-[color:var(--basalt-2)]">sha256 checksum for {i.name}</a>
                )}
              </div>
            ))}
            {appImage && (
              <div className="flex flex-col gap-2" data-appimage-run>
                <CopyBlock text={APPIMAGE_RUN_STEPS.join("\n")} label="AppImage run commands" />
                <p className="text-[13px] text-[color:var(--basalt)]" role="note">{APPIMAGE_WARNING}</p>
              </div>
            )}
            {!hasDesktop(installers, o) && <p className="text-[13px] text-[color:var(--basalt-2)]" data-desktop-pending>Desktop installer: next release.</p>}
          </div>
        );
      })}
    </div>
  );
}
