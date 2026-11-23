pub const MONTHLY: &str = "com.polingual.monthly";
pub const YEARLY: &str = "com.polingual.yearly";
pub const FAMILY: &str = "com.polingual.family.yearly";
pub const LIFETIME: &str = "com.polingual.lifetime";
pub const TRIAL_PLANS: [&str; 2] = [YEARLY, MONTHLY];
pub const PAID: [&str; 4] = [YEARLY, MONTHLY, FAMILY, LIFETIME];
pub const DAY_MS: f64 = 86_400_000.0;

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct EntitlementRecord {
    pub product_id: String,
    pub purchased_ms: i64,
    pub expires_ms: Option<i64>,
    pub revoked_ms: Option<i64>,
    pub introductory: bool,
    pub upgraded: bool,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct PurchaseRecord {
    pub product_id: String,
    pub purchased_ms: i64,
    pub pending: bool,
    pub trial: bool,
}

#[derive(uniffi::Record, Clone, Debug, PartialEq)]
pub struct ServerEntitlement {
    pub active: bool,
    pub product_id: Option<String>,
    pub expires_ms: Option<i64>,
    pub trial: bool,
}

#[derive(uniffi::Enum, Clone, Debug, PartialEq)]
pub enum Access {
    Checking,
    Locked,
    Trial { product_id: String, until_ms: Option<i64> },
    Subscribed { product_id: String, until_ms: Option<i64> },
    Beta,
}

#[uniffi::export]
pub fn access_open(access: Access) -> bool {
    matches!(access, Access::Trial { .. } | Access::Subscribed { .. } | Access::Beta)
}

#[uniffi::export]
pub fn entitlement_live(record: EntitlementRecord, now_ms: i64) -> bool {
    PAID.contains(&record.product_id.as_str()) && record.revoked_ms.is_none() && !record.upgraded && record.expires_ms.is_none_or(|e| e > now_ms)
}

#[uniffi::export]
pub fn store_access(records: Vec<EntitlementRecord>, now_ms: i64, beta: bool) -> Access {
    let mut best: Option<EntitlementRecord> = None;
    for r in records.into_iter().filter(|r| entitlement_live(r.clone(), now_ms)) {
        let key = |x: &EntitlementRecord| x.expires_ms.unwrap_or(i64::MAX);
        if best.as_ref().is_none_or(|b| key(b) < key(&r)) {
            best = Some(r);
        }
    }
    match best {
        None if beta => Access::Beta,
        None => Access::Locked,
        Some(b) if b.introductory && b.expires_ms.is_some() => Access::Trial { product_id: b.product_id, until_ms: b.expires_ms },
        Some(b) => Access::Subscribed { product_id: b.product_id, until_ms: b.expires_ms },
    }
}

#[uniffi::export]
pub fn play_access(records: Vec<PurchaseRecord>, beta: bool, server: Option<ServerEntitlement>, now_ms: i64) -> Access {
    if beta {
        return Access::Beta;
    }
    if let Some(s) = server.filter(|s| s.active && s.expires_ms.is_none_or(|e| e > now_ms)) {
        let product_id = s.product_id.unwrap_or_default();
        return if s.trial { Access::Trial { product_id, until_ms: None } } else { Access::Subscribed { product_id, until_ms: None } };
    }
    let live: Vec<PurchaseRecord> = records.into_iter().filter(|r| PAID.contains(&r.product_id.as_str()) && !r.pending).collect();
    let mut best = live.iter().find(|r| r.product_id == LIFETIME).cloned();
    if best.is_none() {
        for r in &live {
            if best.as_ref().is_none_or(|b| b.purchased_ms < r.purchased_ms) {
                best = Some(r.clone());
            }
        }
    }
    match best {
        None => Access::Locked,
        Some(b) if b.trial => Access::Trial { product_id: b.product_id, until_ms: None },
        Some(b) => Access::Subscribed { product_id: b.product_id, until_ms: None },
    }
}

#[uniffi::export]
pub fn trial_eligible(history: Vec<String>) -> bool {
    !history.iter().any(|p| TRIAL_PLANS.contains(&p.as_str()))
}

#[uniffi::export]
pub fn trial_days_left(access: Access, now_ms: i64) -> Option<i32> {
    match access {
        Access::Trial { until_ms: Some(until), .. } => Some((((until - now_ms) as f64 / DAY_MS).ceil() as i32).max(0)),
        _ => None,
    }
}
