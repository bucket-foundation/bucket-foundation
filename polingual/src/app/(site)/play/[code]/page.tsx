import Room from "../Room";

export default async function PlayRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Room code={code} />;
}
