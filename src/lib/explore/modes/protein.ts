import type { ExploreMode } from "./types";

export const proteinMode: ExploreMode = {
  id: "protein",
  label: "Protein",
  renderer: "protein",
  layout: () => ({
    nodes: [],
    links: [],
    guides: [],
    legend: [
      { label: "cartoon", color: "#C9B27A" },
      { label: "linked residue", color: "#E0A33A" },
    ],
    camera: [0, 0, 6],
  }),
};
