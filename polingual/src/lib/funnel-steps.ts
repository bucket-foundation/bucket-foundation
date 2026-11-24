export const FUNNEL_STEPS = ["landing_view", "signup", "first_lesson", "paywall_view", "trial_start", "paid", "onboarding_view", "heard_about", "trial_cancel_d0"] as const;
export const ONBOARDING_SCREENS = ["sign_in", "heard_about", "languages", "placement"] as const;
export type OnboardingScreen = (typeof ONBOARDING_SCREENS)[number];
export const HEARD_ABOUT = ["tiktok", "instagram", "youtube", "app_store", "google_play", "search", "friend", "school", "reddit", "other"] as const;
export type HeardAbout = (typeof HEARD_ABOUT)[number];
export const APP_CLIENTS = ["android", "ios"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];
