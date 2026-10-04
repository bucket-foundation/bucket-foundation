import { resolve } from "node:path";

export const exploreAliases: Record<string, string> = {
  "@/app/explore/ExploreClient": resolve(import.meta.dirname, "src/explore/ExploreClientV2.tsx"),
  "@/components/explore/SceneHost": resolve(import.meta.dirname, "src/explore/SceneHostV2.tsx"),
  "@/components/explore/ProteinView": resolve(import.meta.dirname, "src/explore/ProteinViewV2.tsx"),
  "@/lib/explore/modes": resolve(import.meta.dirname, "src/explore/modesV2.ts"),
};
