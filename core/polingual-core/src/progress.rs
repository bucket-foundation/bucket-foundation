use std::collections::HashMap;

pub const MILESTONE_WORDS: [i32; 9] = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
pub const MILESTONE_DAYS: [i32; 8] = [3, 7, 14, 30, 50, 100, 200, 365];
pub const STREAK_TARGET: i32 = 100;

#[derive(uniffi::Enum, Clone, Debug, PartialEq, Eq, Hash)]
pub enum Milestone {
    Mastered { lang: String, count: i32 },
    Streak { days: i32 },
}

impl Milestone {
    pub fn key(&self) -> String {
        match self {
            Milestone::Mastered { lang, count } => format!("mastered:{lang}:{count}"),
            Milestone::Streak { days } => format!("streak:{days}"),
        }
    }

    fn size(&self) -> i32 {
        match self {
            Milestone::Mastered { count, .. } => *count,
            Milestone::Streak { days } => *days,
        }
    }
}

#[uniffi::export]
pub fn milestone_id(milestone: Milestone) -> String {
    milestone.key()
}

#[uniffi::export]
pub fn milestones_earned(mastered: HashMap<String, i32>, streak: i32) -> Vec<Milestone> {
    let mut out: Vec<Milestone> = MILESTONE_DAYS.iter().filter(|d| **d <= streak).map(|d| Milestone::Streak { days: *d }).collect();
    let mut langs: Vec<&String> = mastered.keys().collect();
    langs.sort();
    for lang in langs {
        let n = mastered[lang];
        out.extend(MILESTONE_WORDS.iter().filter(|w| **w <= n).map(|w| Milestone::Mastered { lang: lang.clone(), count: *w }));
    }
    out
}

#[uniffi::export]
pub fn milestones_next(earned: Vec<Milestone>, seen: Vec<String>) -> Option<Milestone> {
    let mut best: Option<Milestone> = None;
    for m in earned.into_iter().filter(|m| !seen.contains(&m.key())) {
        if best.as_ref().is_none_or(|b| b.size() < m.size()) {
            best = Some(m);
        }
    }
    best
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct StreakGoal {
    pub day: i32,
    pub left: i32,
    pub reached: bool,
    pub fraction: f64,
}

#[uniffi::export]
pub fn streak_goal(streak: f64) -> StreakGoal {
    let day = if streak.is_finite() { (streak.min(1_000_000.0).trunc() as i32).max(0) } else { 0 };
    StreakGoal {
        day,
        left: (STREAK_TARGET - day).max(0),
        reached: day >= STREAK_TARGET,
        fraction: (day as f64 / STREAK_TARGET as f64).min(1.0),
    }
}
