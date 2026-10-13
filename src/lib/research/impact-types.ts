export const IMPACT_LINES = [
  { id: "education", title: "Education reform", line: "Open the path from consuming knowledge to producing it, for every learner." },
  { id: "discovery", title: "Scientific discovery with ML", line: "Find the open problems within reach of current methods and give researchers instruments to attack them." },
  { id: "capable", title: "More capable humans", line: "Shorten the route to mastery with learning systems that build on what a person already knows." },
] as const;

export type ImpactLine = (typeof IMPACT_LINES)[number]["id"];
export const KINDS = ["paper", "report", "figure", "dataset", "tool", "doc"] as const;
export type ItemKind = (typeof KINDS)[number];

export type ImpactItem = {
  id: string;
  title: string;
  summary: string;
  date: string | null;
  kind: ItemKind;
  impact: ImpactLine;
  href: string;
};
