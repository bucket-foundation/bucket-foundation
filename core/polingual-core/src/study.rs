#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct CardState {
    pub reps: i32,
    pub lapses: i32,
    pub interval_days: f64,
    pub due: i64,
    pub last: i64,
}

pub const DAY_MS: i64 = 86_400_000;
pub const RELEARN_MS: i64 = 600_000;

#[uniffi::export]
pub fn grade(state: CardState, correct: bool, now: i64) -> CardState {
    if correct {
        let interval = if state.reps == 0 {
            1.0
        } else {
            f64::max(1.0, state.interval_days * if state.lapses > 2 { 1.8 } else { 2.5 })
        };
        CardState {
            reps: state.reps + 1,
            interval_days: interval,
            due: now + (interval * DAY_MS as f64) as i64,
            last: now,
            ..state
        }
    } else {
        CardState { lapses: state.lapses + 1, interval_days: 0.0, due: now + RELEARN_MS, last: now, ..state }
    }
}

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { yoe + era * 400 + 1 } else { yoe + era * 400 }, m, d)
}

fn parse_day(s: &str) -> Option<i64> {
    let p: Vec<&str> = s.split('-').collect();
    if p.len() != 3 || p[0].len() != 4 || p[1].len() != 2 || p[2].len() != 2 {
        return None;
    }
    let (y, m, d) = (p[0].parse().ok()?, p[1].parse().ok()?, p[2].parse().ok()?);
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    let n = days_from_civil(y, m, d);
    (civil_from_days(n) == (y, m, d)).then_some(n)
}

fn format_day(n: i64) -> String {
    let (y, m, d) = civil_from_days(n);
    format!("{y:04}-{m:02}-{d:02}")
}

#[uniffi::export]
pub fn streak_count(days: Vec<String>, today: Option<String>) -> i32 {
    let Some(max) = days.iter().max() else { return 0 };
    let set: std::collections::HashSet<&String> = days.iter().collect();
    let Some(mut d) = parse_day(today.as_deref().unwrap_or(max)) else { return 0 };
    if !set.contains(&format_day(d)) {
        d -= 1;
    }
    let mut n = 0;
    while set.contains(&format_day(d)) {
        n += 1;
        d -= 1;
    }
    n
}
