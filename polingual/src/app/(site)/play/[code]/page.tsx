import type { Metadata } from "next";
import Room from "../Room";
import { roomMeta } from "@/lib/room-meta";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return roomMeta("play", (await params).code);
}

export default async function PlayRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Room code={code} />;
}
