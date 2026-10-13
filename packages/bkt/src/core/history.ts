import type { Database } from "bun:sqlite";
const DAY_MS = 86_400_000;

export const HISTORY_DEFAULT_DAYS = 30;
export const HISTORY_MAX_DAYS = 3650;

export interface FormAccuracy {
  form: string;
  answered: number;
  correct: number;
  accuracy: number | null;
}

export interface StudyDay {
  day: string;
  reviews: number;
  answered: number;
  correct: number;
}

export interface StudyHistory {
  days: number;
  studyDays: number;
  reviews: number;
  answered: number;
  correct: number;
  forms: FormAccuracy[];
  byDay: StudyDay[];
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayOf(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function studyHistory(db: Database, now: number, days = HISTORY_DEFAULT_DAYS): StudyHistory {
  const since = now - days * DAY_MS;
  const learn = db.query<{ mode: string; correct: number; at: number }, [number]>("select mode, correct, at from attempts where at >= ? order by at").all(since);
  const work = db.query<{ type: string; correct: number; at: number }, [number]>("select type, correct, at from work_quiz_attempts where at >= ? order by at").all(since);
  const forms = new Map<string, FormAccuracy>();
  const byDay = new Map<string, StudyDay>();
  const note = (form: string, correct: boolean, at: number, review: boolean) => {
    const day = byDay.get(dayOf(at)) ?? { day: dayOf(at), reviews: 0, answered: 0, correct: 0 };
    byDay.set(day.day, day);
    if (review) {
      day.reviews++;
      return;
    }
    const f = forms.get(form) ?? { form, answered: 0, correct: 0, accuracy: null };
    forms.set(form, f);
    f.answered++;
    day.answered++;
    if (correct) {
      f.correct++;
      day.correct++;
    }
  };
  for (const a of learn) note("quiz", a.correct === 1, a.at, a.mode === "review");
  for (const a of work) note(a.type, a.correct === 1, a.at, false);
  const list = [...forms.values()].map((f) => ({ ...f, accuracy: f.answered ? f.correct / f.answered : null })).sort((a, b) => b.answered - a.answered || a.form.localeCompare(b.form));
  const daysList = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  return {
    days,
    studyDays: daysList.length,
    reviews: daysList.reduce((n, d) => n + d.reviews, 0),
    answered: list.reduce((n, f) => n + f.answered, 0),
    correct: list.reduce((n, f) => n + f.correct, 0),
    forms: list,
    byDay: daysList,
  };
}

export const FORM_LABELS: Record<string, string> = {
  quiz: "Multiple choice",
  recall: "Recall",
  true_false: "True or false",
  which_first: "Which came first",
  estimate: "Estimate",
  spot_error: "Spot the error",
};

export function formLabel(form: string): string {
  return FORM_LABELS[form] ?? form.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export const percent = (x: number | null) => (x === null ? "none yet" : `${Math.round(x * 100)}%`);
