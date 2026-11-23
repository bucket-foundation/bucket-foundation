pub mod entitlement;
pub mod games;
pub mod progress;
pub mod puzzles;
pub mod rng;
pub mod study;

#[uniffi::export]
pub fn seed_hash(text: String) -> u64 {
    rng::hash(&text)
}

#[uniffi::export]
pub fn seed_daily(day: String, root: String, targets: Vec<String>) -> u64 {
    rng::daily_seed(&day, &root, &targets)
}

#[uniffi::export]
pub fn core_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

uniffi::setup_scaffolding!();
