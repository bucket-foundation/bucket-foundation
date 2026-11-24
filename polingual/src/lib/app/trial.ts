export const TRIAL_DAYS = 7;
export const REMINDER_DAYS_BEFORE = 3;
export const DEFAULT_PLAN = "yearly";
export const TRIAL_PLANS: readonly string[] = ["yearly"];

const DAY_MS = 86_400_000;

export function trialDays(planId: string): number {
  return TRIAL_PLANS.includes(planId) ? TRIAL_DAYS : 0;
}

export function perWeek(yearlyPrice: number): string {
  return `$${(Math.round((yearlyPrice / 52) * 100) / 100).toFixed(2)} a week`;
}

export interface TimelineStep {
  day: number;
  at: Date;
  title: string;
  body: string;
}

export function trialTimeline(start: Date, price: string): TimelineStep[] {
  const at = (day: number) => new Date(start.getTime() + day * DAY_MS);
  const remind = TRIAL_DAYS - REMINDER_DAYS_BEFORE;
  return [
    { day: 0, at: at(0), title: "Today", body: "Every language opens. No payment now." },
    { day: remind, at: at(remind), title: `Day ${remind}`, body: `We email you that your trial ends in ${REMINDER_DAYS_BEFORE} days.` },
    { day: TRIAL_DAYS, at: at(TRIAL_DAYS), title: `Day ${TRIAL_DAYS}`, body: `Your plan starts at ${price}. Cancel before then and you pay nothing.` },
  ];
}
