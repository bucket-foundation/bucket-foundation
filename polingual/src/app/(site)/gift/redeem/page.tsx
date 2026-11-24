import type { Metadata } from "next";
import { giftMeta } from "@/lib/gift";
import { RedeemView } from "../views";

export const metadata: Metadata = giftMeta("en", "/redeem");

export default function Page() {
  return <RedeemView lang="en" />;
}
