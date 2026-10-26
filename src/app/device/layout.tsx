import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devices",
  description: "Approve and revoke the devices signed in to your Bucket account.",
  robots: { index: false, follow: false },
};

export default function DeviceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
