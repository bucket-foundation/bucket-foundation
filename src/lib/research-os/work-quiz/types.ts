export type QuizType = "recall" | "true_false" | "which_first" | "estimate" | "spot_error";

export const QUIZ_TYPES: readonly QuizType[] = ["recall", "true_false", "which_first", "estimate", "spot_error"];

export interface BeadFact {
  id: string;
  title: string;
  status: string;
  priority: number;
  createdAt: string;
}

export interface PrFact {
  number: number;
  title: string;
  date: string;
  order: number;
}

export interface NoteFact {
  file: string;
  heading: string;
  date: string;
}

export interface WorkSources {
  beads: BeadFact[];
  prs: PrFact[];
  notes: NoteFact[];
  repoUrl: string | null;
}

export interface SourceRef {
  kind: "bead" | "pr" | "note";
  ref: string;
  label: string;
  href: string | null;
}

export interface LearnLink {
  href: string;
  title: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizType;
  prompt: string;
  lines: string[];
  choices: string[] | null;
  answer: string;
  tolerance: number;
  log10Tolerance?: number;
  limitSec: number;
  explain: string;
  sources: SourceRef[];
  learn?: LearnLink | null;
}

export type PublicQuestion = Omit<QuizQuestion, "answer" | "tolerance" | "log10Tolerance" | "explain" | "learn" | "sources">;

export function toPublic(q: QuizQuestion): PublicQuestion {
  return { id: q.id, type: q.type, prompt: q.prompt, lines: q.lines, choices: q.choices, limitSec: q.limitSec };
}

export const TYPE_LABEL: Record<QuizType, string> = {
  recall: "recall",
  true_false: "true or false",
  which_first: "which came first",
  estimate: "estimate the number",
  spot_error: "spot the error",
};
