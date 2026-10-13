import { parseReferenceBasis, type ReferenceBasis } from "./reference-core";

export * from "./reference-core";

let loaded: Promise<ReferenceBasis> | null = null;

export function loadReferenceBasis(): Promise<ReferenceBasis> {
  if (!loaded) loaded = import("@/data/explore/reference-basis.json").then((m) => parseReferenceBasis(m.default));
  return loaded;
}
