package com.polingual.app

object Plan {
    const val MONTHLY = "com.polingual.monthly"
    const val YEARLY = "com.polingual.yearly"
    const val FAMILY = "com.polingual.family.yearly"
    const val LIFETIME = "com.polingual.lifetime"
    val subscriptions = listOf(YEARLY, MONTHLY, FAMILY)
    val paid = subscriptions + LIFETIME
    const val TRIAL_DAYS = 3
    const val TERMS = "https://polingual.com/terms"
    const val PRIVACY = "https://polingual.com/privacy"

    fun hasTrial(id: String) = id == YEARLY || id == MONTHLY
    fun title(id: String) = when (id) { YEARLY -> "Yearly"; MONTHLY -> "Monthly"; FAMILY -> "Family"; LIFETIME -> "Lifetime"; else -> id }
    fun period(id: String) = when (id) { MONTHLY -> "month"; LIFETIME -> "once"; else -> "year" }
}

data class PurchaseRecord(
    val productId: String,
    val purchasedMs: Long,
    val acknowledged: Boolean,
    val pending: Boolean,
    val autoRenewing: Boolean,
    val trial: Boolean = false,
)

sealed interface Access {
    data object Checking : Access
    data object Locked : Access
    data class Trial(val productId: String) : Access
    data class Subscribed(val productId: String) : Access
    data object Beta : Access

    val unlocked: Boolean get() = this is Trial || this is Subscribed || this is Beta
}

object Entitlement {
    fun access(records: List<PurchaseRecord>, beta: Boolean, server: ServerEntitlement? = null, nowMs: Long = System.currentTimeMillis()): Access {
        if (beta) return Access.Beta
        if (server != null && server.active && (server.expiresMs == null || server.expiresMs > nowMs)) {
            return if (server.trial) Access.Trial(server.productId.orEmpty()) else Access.Subscribed(server.productId.orEmpty())
        }
        val live = records.filter { it.productId in Plan.paid && !it.pending }
        val best = live.firstOrNull { it.productId == Plan.LIFETIME } ?: live.maxByOrNull { it.purchasedMs } ?: return Access.Locked
        return if (best.trial) Access.Trial(best.productId) else Access.Subscribed(best.productId)
    }

    fun trialEligible(history: List<String>) = history.none { it in Plan.subscriptions }

    fun disclosure(trial: Boolean, price: String, period: String, family: Boolean = false): String {
        if (period == "once") return "$price once. Charged to your Google Play account. No subscription and no renewal."
        val per = if (period == "year") "$price a year" else "$price a month"
        val lead = if (trial) "${Plan.TRIAL_DAYS} days free, then $per." else "$per."
        val share = if (family) " Share it with up to 5 family members through your Google family group." else ""
        return "$lead Charged to your Google Play account. Renews automatically until you cancel in Google Play subscriptions.$share"
    }
}

data class ServerEntitlement(val active: Boolean, val productId: String?, val expiresMs: Long?, val trial: Boolean)
