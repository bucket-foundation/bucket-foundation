export type WorkQuizType = "recall" | "true_false" | "which_first" | "estimate" | "spot_error";
export type LanguageQuizType = "meaning" | "sound" | "language" | "pair";
export type QuizType = WorkQuizType | LanguageQuizType;

export const QUIZ_TYPES: readonly WorkQuizType[] = ["recall", "true_false", "which_first", "estimate", "spot_error"];
export const LANGUAGE_QUIZ_TYPES: readonly LanguageQuizType[] = ["meaning", "sound", "language", "pair"];
export const ALL_QUIZ_TYPES: readonly QuizType[] = [...QUIZ_TYPES, ...LANGUAGE_QUIZ_TYPES];
export const SOURCE_KINDS = ["bead", "pr", "note", "chat", "word"] as const;

export function isWorkQuizType(type: QuizType): type is WorkQuizType {
  return (QUIZ_TYPES as readonly QuizType[]).includes(type);
}

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
  kind: (typeof SOURCE_KINDS)[number];
  ref: string;
  label: string;
  href: string | null;
}

export interface LearnLink {
  href: string;
  title: string;
}

export interface QuestionWord {
  lang: string | null;
  choicesLang: string | null;
  credit: string;
  href: string | null;
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
  word?: QuestionWord;
}

export type PublicQuestion = Omit<QuizQuestion, "answer" | "tolerance" | "log10Tolerance" | "explain" | "learn" | "sources">;

export function toPublic(q: QuizQuestion): PublicQuestion {
  return { id: q.id, type: q.type, prompt: q.prompt, lines: q.lines, choices: q.choices, limitSec: q.limitSec, ...(q.word ? { word: q.word } : {}) };
}

export const TYPE_LABEL: Record<QuizType, string> = {
  recall: "recall",
  true_false: "true or false",
  which_first: "which came first",
  estimate: "estimate the number",
  spot_error: "spot the error",
  meaning: "word meaning",
  sound: "word sound",
  language: "which language",
  pair: "word pair",
};

export function retiredNotice(retired: number): string {
  if (retired <= 0) return "";
  return retired === 1 ? "1 review card was over the length limit, had no shorter form, and was retired." : `${retired} review cards were over the length limit, had no shorter form, and were retired.`;
}
