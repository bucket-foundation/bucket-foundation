export type { Look } from "@/ui/avatar";

export const TIERS = [
  { name: "Parchment", color: "#EBDDBE", ink: "#3A0F2F" },
  { name: "Ochre", color: "#E9A23B", ink: "#3A0F2F" },
  { name: "Maya", color: "#6FB7C2", ink: "#3A0F2F" },
  { name: "Malachite", color: "#1E7A5A", ink: "#F6EEDC" },
  { name: "Lapis", color: "#26428B", ink: "#F6EEDC" },
  { name: "Vermilion", color: "#D9381E", ink: "#F6EEDC" },
  { name: "Tyrian", color: "#5B1A4A", ink: "#F6EEDC" },
  { name: "Gold", color: "#E9A23B", ink: "#5B1A4A" },
];

export const ANSWER_COLORS = [
  { name: "Vermilion", hex: "#D9381E", shape: "triangle" },
  { name: "Lapis", hex: "#26428B", shape: "diamond" },
  { name: "Ochre", hex: "#E9A23B", shape: "circle" },
  { name: "Malachite", hex: "#1E7A5A", shape: "square" },
] as const;
