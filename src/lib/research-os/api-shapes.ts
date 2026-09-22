/**
 * The shapes three Research OS routes answer with, declared once.
 *
 * A route built its reply inline and its client declared the same fields
 * by hand. Widening a field on the route was then invisible to the
 * client, and the page rendered the new value as text: `/loop` made two
 * counts nullable and the panel printed "null connections held" to the
 * learner. That one is fixed, in `loop-shape.ts`, which is the pattern
 * this file follows for the three pairs that remain.
 *
 * A client reading fewer fields than a route sends is safe, and the
 * danger runs the other way: a field the client types more narrowly than
 * the route can return. One declaration makes that a compile error.
 */
import type { Stage } from "./types";

export interface NodeLite {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
}

/** `GET /api/research-os/route` */
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

/** `POST /api/research-os/probe` */
export interface ProbeAnswerResponse {
  result: string;
  /** The grader's own verdict, as one of three words. */
  confidence: "high" | "medium" | "low";
  abstained: boolean;
  feedback: string;
  stage: Stage;
}
