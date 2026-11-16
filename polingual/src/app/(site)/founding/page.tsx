import type { Metadata } from "next";
import Legal from "@/app/legal";
import { FOUNDING_FAMILIES, OFFER } from "@/lib/founding";
import Confirm from "./Confirm";

export const metadata: Metadata = { title: "Confirm your founding family spot", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Legal>
      <h1>Founding family, free for life</h1>
      <p className="lede">{OFFER}</p>
      <Confirm total={FOUNDING_FAMILIES} />
    </Legal>
  );
}
