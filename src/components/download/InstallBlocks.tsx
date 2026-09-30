import CopyBlock from "../CopyBlock";
import { APPIMAGE_RUN_STEPS, APPIMAGE_WARNING, DISTRO_LABEL, INSTALL_COMMAND, INSTALL_SHELL, executableStep, linuxInstallCommand, releaseTagOf, type Distro } from "../../lib/download/install";
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

export default function InstallBlocks({ os, arch = null, distro = null, installers }: { os: Os | null; arch?: Arch | null; distro?: Distro | null; installers: InstallerV2[] }) {
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
            <p className="text-[13px] text-[color:var(--basalt-2)]">
              Paste this into {INSTALL_SHELL[o]}{o === "linux" && distro ? ` on ${DISTRO_LABEL[distro]}` : ""}.{" "}
              {o === "linux" && appImage ? `It runs install.sh pinned to release ${releaseTagOf(appImage.url) ?? "main"}, installs the Bucket app, adds it to your app menu and checks the signature first.` : "It installs the bkt terminal app and checks the signature first."}
            </p>
            <CopyBlock text={o === "linux" ? linuxInstallCommand(appImage?.url ?? null) : INSTALL_COMMAND[o]} label={`${OS_LABEL[o]} install command`} />
            {o === "linux" && appImage ? (
              <div className="flex flex-col gap-3" data-other-ways>
                <h4 className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)]">Other ways</h4>
                <div className="flex flex-col gap-2" data-appimage-run>
                  <p className="text-[13px] text-[color:var(--basalt)]">Make the file executable first, then open it.</p>
                  <CopyBlock text={APPIMAGE_RUN_STEPS.join("\n")} label="AppImage run commands" />
                  <p className="text-[13px] text-[color:var(--basalt)]" data-executable-step>{executableStep(distro)}</p>
                  <p className="text-[13px] text-[color:var(--basalt)]" role="note">{APPIMAGE_WARNING}</p>
                </div>
                <a href={appImage.url} className={SECONDARY} data-direct={o} data-kind={appImage.kind}>
                  <span>{directLabel(appImage)}</span>
                  <span className="normal-case tracking-normal text-[12px] opacity-80">{megabytes(appImage.size)}</span>
                </a>
                {appImage.checksumUrl && (
                  <a href={appImage.checksumUrl} className="text-[12px] underline text-[color:var(--basalt-2)]">sha256 checksum for {appImage.name}</a>
                )}
                {mine.filter((i) => i !== appImage).map((i) => (
                  <a key={i.name} href={i.url} className={SECONDARY} data-direct={o} data-kind={i.kind}>
                    <span>{directLabel(i)}</span>
                    <span className="normal-case tracking-normal text-[12px] opacity-80">{megabytes(i.size)}</span>
                  </a>
                ))}
              </div>
            ) : (
              mine.map((i) => (
                <div key={i.name} className="flex flex-col gap-1">
                  <a href={i.url} className={SECONDARY} data-direct={o} data-kind={i.kind}>
                    <span>{directLabel(i)}</span>
                    <span className="normal-case tracking-normal text-[12px] opacity-80">{megabytes(i.size)}</span>
                  </a>
                  {i.checksumUrl && (
                    <a href={i.checksumUrl} className="text-[12px] underline text-[color:var(--basalt-2)]">sha256 checksum for {i.name}</a>
                  )}
                </div>
              ))
            )}
            {!hasDesktop(installers, o) && <p className="text-[13px] text-[color:var(--basalt-2)]" data-desktop-pending>Desktop installer: next release.</p>}
          </div>
        );
      })}
    </div>
  );
}
