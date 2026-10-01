import CopyBlock from "../CopyBlock";
import { APPIMAGE_WARNING_SHORT, FIRST_OPEN, INSTALL_COMMAND, linuxInstallCommand } from "../../lib/download/install";
import { OS_LABEL, type Os } from "../../lib/download/release";
import { type InstallerV2, type WindowedInstaller } from "../../lib/download/release-v2";
import { osOrder } from "./InstallBlocks";

function commandFor(os: Os, installers: InstallerV2[]): string {
  if (os !== "linux") return INSTALL_COMMAND[os];
  const appImage = installers.find((i) => i.os === "linux" && /\.AppImage$/i.test(i.name));
  return linuxInstallCommand(appImage?.url ?? null);
}

const ARCH_LABEL: Record<string, string> = { "macos/arm64": "Apple silicon", "macos/x64": "Intel", "linux/arm64": "ARM" };
const SMALL_LINK = "underline text-[12px] text-[color:var(--basalt-2)] min-h-[44px] flex items-center";
const LINK = "underline text-[14px] text-[color:var(--basalt)] min-h-[44px] flex items-center";

function linkLabel(w: WindowedInstaller): string {
  const arch = ARCH_LABEL[`${w.os}/${w.arch}`];
  return `Download the ${OS_LABEL[w.os]} app${arch ? `, ${arch}` : ""}`;
}

function Block({ os, installers, windowed }: { os: Os; installers: InstallerV2[]; windowed: WindowedInstaller[] }) {
  const apps = windowed.filter((w) => w.os === os);
  const firstOpen = apps.some((w) => !w.signed) ? FIRST_OPEN[os] : undefined;
  return (
    <div data-os={os} className="flex flex-col gap-2">
      <h3 className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)]">{OS_LABEL[os]}</h3>
      {apps.map((w) => (
        <div key={w.name} className="flex items-center gap-4">
          <a href={w.url} className={LINK} data-windowed-installer={`${w.os}-${w.arch}`}>{linkLabel(w)}</a>
          {w.checksumUrl && <a href={w.checksumUrl} className={SMALL_LINK} data-checksum={`${w.os}-${w.arch}`}>sha256</a>}
        </div>
      ))}
      {firstOpen && (
        <details data-first-open={os}>
          <summary className="text-[13px] text-[color:var(--basalt-2)] cursor-pointer min-h-[44px] flex items-center">{firstOpen.summary}</summary>
          <p className="text-[13px] text-[color:var(--basalt)]">{firstOpen.steps}</p>
        </details>
      )}
      <CopyBlock text={commandFor(os, installers)} label={`${OS_LABEL[os]} install command`} />
      {os === "linux" && <p className="text-[13px] text-[color:var(--basalt)]" role="note">{APPIMAGE_WARNING_SHORT}</p>}
    </div>
  );
}

export default function InstallBlocksV3({ os, installers, windowed = [] }: { os: Os | null; installers: InstallerV2[]; windowed?: WindowedInstaller[] }) {
  const [first, ...rest] = osOrder(os);
  return (
    <div className="flex flex-col gap-4" data-install-blocks>
      <Block os={first} installers={installers} windowed={windowed} />
      <details data-other-platforms>
        <summary className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)] cursor-pointer min-h-[44px] flex items-center">Other platforms</summary>
        <div className="mt-2 flex flex-col gap-4">
          {rest.map((o) => (
            <Block key={o} os={o} installers={installers} windowed={windowed} />
          ))}
        </div>
      </details>
    </div>
  );
}
