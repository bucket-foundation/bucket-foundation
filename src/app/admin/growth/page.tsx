import type { Metadata } from "next";
import GrowthAdmin from "./GrowthAdmin";

export const metadata: Metadata = {
  title: "Growth",
  robots: { index: false, follow: false },
};

export default function GrowthAdminPage() {
  return (
    <main className="px-4 md:px-6 pt-10 md:pt-16 pb-16">
      <div className="mx-auto w-full max-w-[1100px]">
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Growth</h1>
        <GrowthAdmin />
      </div>
    </main>
  );
}
