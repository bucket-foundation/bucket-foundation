import { redirect } from "next/navigation";

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function AcademyPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const pick = (k: string) => {
    const v = searchParams?.[k];
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" && SLUG.test(s) ? s : null;
  };
  const branch = pick("branch") ?? pick("deck");
  const atom = pick("atom");
  if (branch && atom) redirect(`/research-os/learn/${branch}/${atom}`);
  if (branch) redirect(`/research-os/learn/${branch}`);
  redirect("/research-os/learn");
}
