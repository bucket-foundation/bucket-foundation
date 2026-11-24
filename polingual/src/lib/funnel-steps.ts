export const FUNNEL_STEPS = ["landing_view", "signup", "first_lesson", "paywall_view", "trial_start", "paid"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];
