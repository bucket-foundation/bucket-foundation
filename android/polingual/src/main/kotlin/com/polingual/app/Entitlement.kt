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
    fun title(id: String) = when (id) { MONTHLY -> R.string.plan_monthly; FAMILY -> R.string.plan_family; LIFETIME -> R.string.plan_lifetime; else -> R.string.plan_yearly }
    fun per(id: String) = when (id) { MONTHLY -> R.string.per_month; LIFETIME -> R.string.per_once; else -> R.string.per_year }
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
}

data class ServerEntitlement(val active: Boolean, val productId: String?, val expiresMs: Long?, val trial: Boolean)
