import type { Stage } from "./types";

export interface NodeLite {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
}

export interface RouteResponse {
  target: NodeLite;
  frontier: unknown;
  chain: unknown[];
  gap: NodeLite[];
  lowConfidenceFlags: unknown;
  engineFrontier: unknown;
  openQuestions: NodeLite[];
  guidance: unknown;
  llmEnabled: boolean;
  learner: "self" | "anonymous";
}

export interface ProbeAnswerResponse {
  result: string;
  confidence: "high" | "medium" | "low";
  abstained: boolean;
  feedback: string;
  stage: Stage;
}
