import type { DeviceChoice, DeviceLink } from "@/lib/download/device";

const PRIMARY =
  "w-full px-4 py-3 text-[13px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] min-h-[44px] flex items-center justify-center text-center";
const PRIMARY_OFF =
  "w-full px-4 py-3 text-[13px] small-caps tracking-[0.14em] border border-[color:var(--hairline)] text-[color:var(--basalt-3)] min-h-[44px] flex items-center justify-center text-center";
const ROW = "flex items-center justify-between gap-4 min-h-[44px] text-[13px] border-b border-[color:var(--hairline)]";

function Primary({ link }: { link: DeviceLink }) {
  return link.href ? (
    <a href={link.href} className={PRIMARY} data-device-primary={link.device}>{link.action}</a>
  ) : (
    <span aria-disabled="true" className={PRIMARY_OFF} data-device-primary={link.device}>{link.label}: {link.action}</span>
  );
}

export default function DevicePicker({ primary, others }: DeviceChoice) {
  const detected = primary.length > 1 ? "macos" : primary[0].device;
  return (
    <div className="flex flex-col gap-4" data-device-picker data-detected={detected}>
      <p className="text-[13px] text-[color:var(--basalt-2)]">{primary.length > 1 ? "For your Mac. Apple menu, About This Mac shows the chip." : `For your ${primary[0].label}`}</p>
      {primary.map((l) => <Primary key={l.device} link={l} />)}
      <ul className="flex flex-col" aria-label="Other devices">
        {others.map((l) => (
          <li key={l.device} className={ROW} data-device-other={l.device}>
            <span className="text-[color:var(--basalt)]">{l.label}</span>
            {l.href ? <a href={l.href} className="underline text-[color:var(--basalt-2)]">{l.action}</a> : <span className="text-[color:var(--basalt-3)]">{l.action}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
