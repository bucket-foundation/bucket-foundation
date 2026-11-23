use std::collections::HashMap;

use polingual_core::entitlement::{self, Access, EntitlementRecord, PurchaseRecord, ServerEntitlement};
use polingual_core::progress::{self, Milestone};
use polingual_core::puzzles;

fn rec(id: &str, expires: Option<i64>, intro: bool) -> EntitlementRecord {
    EntitlementRecord { product_id: id.into(), purchased_ms: 0, expires_ms: expires, revoked_ms: None, introductory: intro, upgraded: false }
}

#[test]
fn store_access_follows_swift() {
    assert_eq!(entitlement::store_access(vec![], 0, false), Access::Locked);
    assert_eq!(entitlement::store_access(vec![], 0, true), Access::Beta);
    let trial = entitlement::store_access(vec![rec(entitlement::YEARLY, Some(5 * 86_400_000), true)], 0, true);
    assert_eq!(trial, Access::Trial { product_id: entitlement::YEARLY.into(), until_ms: Some(5 * 86_400_000) });
    assert_eq!(entitlement::trial_days_left(trial, 86_400_000 / 2), Some(5));
    let best = entitlement::store_access(vec![rec(entitlement::MONTHLY, Some(10), false), rec(entitlement::LIFETIME, None, false)], 0, false);
    assert_eq!(best, Access::Subscribed { product_id: entitlement::LIFETIME.into(), until_ms: None });
    assert_eq!(entitlement::store_access(vec![rec(entitlement::MONTHLY, Some(10), false)], 10, false), Access::Locked);
    let mut revoked = rec(entitlement::MONTHLY, None, false);
    revoked.revoked_ms = Some(1);
    assert_eq!(entitlement::store_access(vec![revoked], 0, false), Access::Locked);
    assert!(entitlement::access_open(Access::Beta));
    assert!(!entitlement::access_open(Access::Checking));
}

#[test]
fn trial_eligibility_follows_swift() {
    assert!(entitlement::trial_eligible(vec![entitlement::LIFETIME.into(), entitlement::FAMILY.into()]));
    assert!(!entitlement::trial_eligible(vec![entitlement::MONTHLY.into()]));
}

fn play(id: &str, at: i64, pending: bool, trial: bool) -> PurchaseRecord {
    PurchaseRecord { product_id: id.into(), purchased_ms: at, pending, trial }
}

#[test]
fn play_access_matches_kotlin_entitlement_test() {
    assert_eq!(entitlement::play_access(vec![], false, None, 0), Access::Locked);
    assert_eq!(entitlement::play_access(vec![], true, None, 0), Access::Beta);
    assert_eq!(entitlement::play_access(vec![play(entitlement::YEARLY, 1, true, false)], false, None, 0), Access::Locked);
    assert_eq!(
        entitlement::play_access(vec![play(entitlement::MONTHLY, 9, false, false), play(entitlement::LIFETIME, 1, false, false)], false, None, 0),
        Access::Subscribed { product_id: entitlement::LIFETIME.into(), until_ms: None }
    );
    assert_eq!(entitlement::play_access(vec![play("other.app.pro", 1, false, false)], false, None, 0), Access::Locked);
    let server = |exp| Some(ServerEntitlement { active: true, product_id: Some(entitlement::YEARLY.into()), expires_ms: Some(exp), trial: true });
    assert_eq!(entitlement::play_access(vec![], false, server(2_000), 1_000), Access::Trial { product_id: entitlement::YEARLY.into(), until_ms: None });
    assert_eq!(entitlement::play_access(vec![], false, server(500), 1_000), Access::Locked);
}

#[test]
fn milestones_follow_swift() {
    let mastered = HashMap::from([("fr".to_string(), 12), ("es".to_string(), 1)]);
    let earned = progress::milestones_earned(mastered, 8);
    let ids: Vec<String> = earned.iter().map(Milestone::key).collect();
    assert_eq!(ids, ["streak:3", "streak:7", "mastered:es:1", "mastered:fr:1", "mastered:fr:5", "mastered:fr:10"]);
    assert_eq!(progress::milestones_next(earned.clone(), vec![]), Some(Milestone::Mastered { lang: "fr".into(), count: 10 }));
    assert_eq!(progress::milestones_next(earned, vec!["mastered:fr:10".into()]), Some(Milestone::Streak { days: 7 }));
    let tie = vec![Milestone::Streak { days: 7 }, Milestone::Mastered { lang: "fr".into(), count: 7 }];
    assert_eq!(progress::milestones_next(tie, vec![]), Some(Milestone::Streak { days: 7 }));
}

#[test]
fn streak_goal_follows_swift() {
    let g = progress::streak_goal(42.9);
    assert_eq!((g.day, g.left, g.reached), (42, 58, false));
    assert_eq!(progress::streak_goal(f64::NAN).day, 0);
    assert_eq!(progress::streak_goal(-3.0).day, 0);
    let done = progress::streak_goal(250.0);
    assert_eq!((done.left, done.reached, done.fraction), (0, true, 1.0));
}

#[test]
fn mini_letters_use_graphemes_like_swift() {
    assert_eq!(puzzles::mini_letters("नमक".into()), Some(vec!["न".into(), "म".into(), "क".into()]));
    assert_eq!(puzzles::mini_letters("किताब".into()).map(|l| l.len()), Some(3));
    assert_eq!(puzzles::mini_letters("maße".into()), Some(vec!["M".into(), "A".into(), "ß".into(), "E".into()]));
    assert_eq!(puzzles::mini_letters("ab".into()), None);
    assert_eq!(puzzles::mini_letters("a-b-c".into()), None);
}
