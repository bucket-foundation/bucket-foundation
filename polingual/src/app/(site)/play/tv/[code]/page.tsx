import type { Metadata } from "next";
import { roomMeta } from "@/lib/room-meta";
import TvHost from "../TvHost";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return roomMeta("play", (await params).code);
}

export default async function PlayTvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TvHost code={code} />;
}
