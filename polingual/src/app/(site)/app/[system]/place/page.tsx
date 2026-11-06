import Placement from "./Placement";

export default async function Page({ params, searchParams }: { params: Promise<{ system: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { system } = await params;
  const { lang } = await searchParams;
  return <Placement systemId={decodeURIComponent(system)} lang={lang ?? null} />;
}
