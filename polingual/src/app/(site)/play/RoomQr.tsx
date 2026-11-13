"use client";

import qrcode from "qrcode-generator";
import { useEffect, useMemo, useState } from "react";
import styles from "./world.module.css";

export default function RoomQr({ code }: { code: string }) {
  const [origin, setOrigin] = useState("https://polingual.com");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/play/${code}`;
  const { size, cells } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const out: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) out.push(`M${c} ${r}h1v1h-1z`);
    return { size: n, cells: out.join("") };
  }, [url]);
  return (
    <figure className={styles.qr} data-testid="room-qr">
      <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={`QR code to join ${code}`} shapeRendering="crispEdges">
        <path d={cells} style={{ fill: "var(--pl-ink)" }} />
      </svg>
      <figcaption>Scan to join</figcaption>
    </figure>
  );
}
