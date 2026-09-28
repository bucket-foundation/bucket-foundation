export function formatStars(stars: number): string {
  return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
}

export async function loadStars(
  url: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  try {
    const res = await fetchImpl(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}
