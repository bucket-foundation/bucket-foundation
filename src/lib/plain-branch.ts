export function plainBranch(slug: string | null | undefined): string {
  if (!slug) return "";
  const words = slug.replace(/^\d+-/, "").replace(/[-_]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : slug;
}
