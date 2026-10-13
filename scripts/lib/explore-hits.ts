import type { Hit } from "../../src/lib/explore/search";

export const SAMPLE_HITS: Hit[] = [
  { id: "excerpt:02-physics/quantum/a", type: "excerpt", title: "Photon", subtitle: "", text: "photon quantum electron carbon MTHFR", score: 0.9, branch: "02-physics", year: null, url: null, links: ["advisor:2"] },
  { id: "excerpt:05-biophysics/light/b", type: "excerpt", title: "Light", subtitle: "", text: "light water oxygen APOE", score: 0.7, branch: "05-biophysics", year: null, url: null, links: ["advisor:1"] },
  { id: "excerpt:03-chemistry/carbon/c", type: "excerpt", title: "Carbon", subtitle: "", text: "carbon bond hydrogen electron", score: 0.5, branch: "03-chemistry", year: null, url: null, links: [] },
  { id: "advisor:2", type: "advisor", title: "Sample Advisor B", subtitle: "physics", text: "quantum photon", score: 0.8, branch: "physics", year: 1985, url: null, links: ["excerpt:02-physics/quantum/a"] },
  { id: "advisor:1", type: "advisor", title: "Sample Advisor A", subtitle: "biophysics", text: "light", score: 0.6, branch: "biophysics", year: 1998, url: null, links: ["excerpt:05-biophysics/light/b"] },
  { id: "work:02-physics/quantum", type: "work", title: "quantum", subtitle: "", text: "", score: 0.85, branch: "02-physics", year: null, url: null, links: ["excerpt:02-physics/quantum/a"] },
];
