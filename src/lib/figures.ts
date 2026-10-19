import registry from "../../tools/generations/registry.json";
import manifest from "../../public/figures/manifest.json";

export const REPO_BLOB = "https://github.com/bucket-foundation/bucket-foundation/blob/dev";

type RegistryEntry = {
  name: string;
  script: string;
  about: string;
  topic?: string;
  licence?: string;
  inputs: Record<string, string>;
  data: string[];
  outputs: string[];
};

type ManifestEntry =
  | { name: string; published: false; missing: string[] }
  | { name: string; published: true; image: string; ran: string; params: Record<string, string>; width: number; height: number; data_sha256: Record<string, string> };

export type Figure = {
  name: string;
  about: string;
  topic: string;
  licence: string | null;
  scriptPath: string;
  scriptUrl: string;
  data: { path: string; url: string | null }[];
  params: Record<string, string>;
  image: { src: string; width: number; height: number } | null;
  ran: string | null;
  missing: string[];
};

const repoPath = (p: string) => !p.startsWith("~/");

export function loadFigures(
  reg: { generations: RegistryEntry[] } = registry as unknown as { generations: RegistryEntry[] },
  man: { figures: ManifestEntry[] } = manifest as unknown as { figures: ManifestEntry[] },
): Figure[] {
  const built = new Map(man.figures.map((f) => [f.name, f]));
  const figures = reg.generations.map((g): Figure => {
    const m = built.get(g.name);
    const published = m?.published === true ? m : null;
    const missing = m && !m.published ? m.missing : published ? [] : g.data;
    return {
      name: g.name,
      about: g.about,
      topic: g.topic ?? "research",
      licence: g.licence ?? null,
      scriptPath: `tools/generations/${g.script}`,
      scriptUrl: `${REPO_BLOB}/tools/generations/${g.script}`,
      data: g.data.map((d) => ({ path: d, url: repoPath(d) && !missing.includes(d) ? `${REPO_BLOB}/${d}` : null })),
      params: published?.params ?? {},
      image: published ? { src: published.image, width: published.width, height: published.height } : null,
      ran: published?.ran ?? null,
      missing,
    };
  });
  return [...figures.filter((f) => f.topic === "language"), ...figures.filter((f) => f.topic !== "language")];
}
