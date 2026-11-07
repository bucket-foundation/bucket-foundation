"use client";

import qrcode from "qrcode-generator";
import { useMemo } from "react";
import styles from "./stoa.module.css";

export default function Qr({ text }: { text: string }) {
  const { size, cells } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const out: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) out.push(`M${c} ${r}h1v1h-1z`);
    return { size: n, cells: out.join("") };
  }, [text]);
  return (
    <div className={styles.qr} data-testid="qr">
      <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={`QR code for ${text}`} shapeRendering="crispEdges">
        <path d={cells} fill="#231F20" />
      </svg>
    </div>
  );
}
