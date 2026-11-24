import type { Metadata } from "next";
import Phone from "../Phone";
import { roomMeta } from "@/lib/room-meta";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return roomMeta("join", (await params).code);
}

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Phone initialCode={code} />;
}
