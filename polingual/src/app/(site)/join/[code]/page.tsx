import Phone from "../Phone";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Phone initialCode={code} />;
}
