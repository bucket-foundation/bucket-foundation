import CopyBlock from "../CopyBlock";
import { APPIMAGE_WARNING_SHORT, INSTALL_COMMAND, linuxInstallCommand } from "../../lib/download/install";
import { OS_LABEL, type Os } from "../../lib/download/release";
import { type InstallerV2 } from "../../lib/download/release-v2";
import { osOrder } from "./InstallBlocks";

function commandFor(os: Os, installers: InstallerV2[]): string {
  if (os !== "linux") return INSTALL_COMMAND[os];
  const appImage = installers.find((i) => i.os === "linux" && /\.AppImage$/i.test(i.name));
  return linuxInstallCommand(appImage?.url ?? null);
}

function Block({ os, installers }: { os: Os; installers: InstallerV2[] }) {
  return (
    <div data-os={os} className="flex flex-col gap-2">
      <h3 className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)]">{OS_LABEL[os]}</h3>
      <CopyBlock text={commandFor(os, installers)} label={`${OS_LABEL[os]} install command`} />
      {os === "linux" && <p className="text-[13px] text-[color:var(--basalt)]" role="note">{APPIMAGE_WARNING_SHORT}</p>}
    </div>
  );
}

export default function InstallBlocksV3({ os, installers }: { os: Os | null; installers: InstallerV2[] }) {
  const [first, ...rest] = osOrder(os);
  return (
    <div className="flex flex-col gap-4" data-install-blocks>
      <Block os={first} installers={installers} />
      <details data-other-platforms>
        <summary className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)] cursor-pointer min-h-[44px] flex items-center">Other platforms</summary>
        <div className="mt-2 flex flex-col gap-4">
          {rest.map((o) => (
            <Block key={o} os={o} installers={installers} />
          ))}
        </div>
      </details>
    </div>
  );
}
