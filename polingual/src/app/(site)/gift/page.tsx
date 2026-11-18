import type { Metadata } from "next";
import { giftMeta } from "@/lib/gift";
import { GiftView } from "./views";

export const metadata: Metadata = giftMeta("en", "");

export default function Page() {
  return <GiftView lang="en" />;
}
