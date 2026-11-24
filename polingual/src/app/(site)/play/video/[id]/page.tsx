import { notFound } from "next/navigation";
import VideoRoom from "../VideoRoom";
import { videoIndex } from "../videos";

export const dynamicParams = false;

export function generateStaticParams() {
  return videoIndex().map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: videoIndex().find((v) => v.id === id)?.title ?? "Watch" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!videoIndex().some((v) => v.id === id)) notFound();
  return <VideoRoom id={id} />;
}
