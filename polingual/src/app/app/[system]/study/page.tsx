import Session from "./Session";

export default async function Page({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  return <Session systemId={decodeURIComponent(system)} />;
}
