import CopyBlock from "../CopyBlock";
import { APPIMAGE_WARNING_SHORT, DIRECT_FILE_STEP, DIRECT_FILE_STEP_RAW, DIRECT_FILE_SUMMARY, FIRST_OPEN, INSTALL_COMMAND, LINUX_INSTALL_NOTE, LINUX_PACKAGE_LABEL, appImageRunSteps, linuxInstallCommand } from "../../lib/download/install";
import { OS_LABEL, type Os } from "../../lib/download/release";
import { directFiles, isBareExecutable, type InstallerV2, type WindowedInstaller } from "../../lib/download/release-v2";
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
  if (w.format === "deb" || w.format === "rpm") return LINUX_PACKAGE_LABEL[w.format];
  if (isBareExecutable(w)) return `Download ${w.name}`;
  const arch = ARCH_LABEL[`${w.os}/${w.arch}`];
  return `Download the ${OS_LABEL[w.os]} app${arch ? `, ${arch}` : ""}`;
}

function Block({ os, installers, windowed }: { os: Os; installers: InstallerV2[]; windowed: WindowedInstaller[] }) {
  const mine = windowed.filter((w) => w.os === os);
  const apps = mine.filter((w) => !isBareExecutable(w));
  const bare = directFiles(mine);
  const firstOpen = apps.some((w) => !w.signed) ? FIRST_OPEN[os] : undefined;
  return (
    <div data-os={os} className="flex flex-col gap-2">
      <h3 className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)]">{OS_LABEL[os]}</h3>
      {os === "linux" && (
        <div className="flex flex-col gap-2" data-primary-install>
          <CopyBlock text={commandFor(os, installers)} label={`${OS_LABEL[os]} install command`} />
          {installers.some((i) => i.os === "linux" && i.kind === "desktop") && <p className="text-[13px] text-[color:var(--basalt)]" data-install-note>{LINUX_INSTALL_NOTE}</p>}
        </div>
      )}
      {apps.map((w) => (
        <div key={w.name} className="flex items-center gap-4">
          <a href={w.url} className={LINK} data-windowed-installer={`${w.os}-${w.arch}`} data-format={w.format}>{linkLabel(w)}</a>
          {w.checksumUrl && <a href={w.checksumUrl} className={SMALL_LINK} data-checksum={`${w.os}-${w.arch}`}>sha256</a>}
        </div>
      ))}
      {firstOpen && (
        <details data-first-open={os}>
          <summary className="text-[13px] text-[color:var(--basalt-2)] cursor-pointer min-h-[44px] flex items-center">{firstOpen.summary}</summary>
          <p className="text-[13px] text-[color:var(--basalt)]">{firstOpen.steps}</p>
        </details>
      )}
      {os !== "linux" && <CopyBlock text={commandFor(os, installers)} label={`${OS_LABEL[os]} install command`} />}
      {bare.length > 0 && (
        <details data-direct-file>
          <summary className="text-[13px] text-[color:var(--basalt-2)] cursor-pointer min-h-[44px] flex items-center">{DIRECT_FILE_SUMMARY}</summary>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-[color:var(--basalt)]">{bare.every((w) => w.format === "AppImage.tar.gz") ? DIRECT_FILE_STEP : DIRECT_FILE_STEP_RAW}</p>
            {bare.map((w) => (
              <div key={w.name} className="flex flex-col gap-2">
                <CopyBlock text={appImageRunSteps(w.name)} label={`AppImage run commands, ${w.arch}`} />
                <div className="flex items-center gap-4">
                  <a href={w.url} className={SMALL_LINK} data-windowed-installer={`${w.os}-${w.arch}`}>{linkLabel(w)}</a>
                  {w.checksumUrl && <a href={w.checksumUrl} className={SMALL_LINK} data-checksum={`${w.os}-${w.arch}`}>sha256</a>}
                </div>
              </div>
            ))}
            <p className="text-[13px] text-[color:var(--basalt)]" role="note">{APPIMAGE_WARNING_SHORT}</p>
          </div>
        </details>
      )}
      {os === "linux" && bare.length === 0 && <p className="text-[13px] text-[color:var(--basalt)]" role="note">{APPIMAGE_WARNING_SHORT}</p>}
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
