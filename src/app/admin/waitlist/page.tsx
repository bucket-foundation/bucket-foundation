import type { Metadata } from "next";
import WaitlistAdmin from "./WaitlistAdmin";

export const metadata: Metadata = {
  title: "Launch list",
  robots: { index: false, follow: false },
};

export default function WaitlistAdminPage() {
  return (
    <main className="px-4 md:px-6 pt-10 md:pt-16 pb-16">
      <div className="mx-auto w-full max-w-[1100px]">
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Launch list</h1>
        <WaitlistAdmin />
      </div>
    </main>
  );
}
