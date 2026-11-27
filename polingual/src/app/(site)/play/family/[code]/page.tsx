import FamilyJoin from "./FamilyJoin";

export const metadata = { title: "Join the family", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <FamilyJoin code={code} />;
}
