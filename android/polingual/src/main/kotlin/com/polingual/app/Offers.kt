package com.polingual.app

object Offers {
    const val WINBACK = "winback"
    const val UPSELL_KEY = "polingual.upsell.shown"
    val upsell = listOf(Plan.FAMILY, Plan.LIFETIME)

    fun pick(productId: String, offerIds: List<String?>, trialEligible: Boolean, returning: Boolean): String? {
        if (productId != Plan.YEARLY) return null
        if (trialEligible) return offerIds.firstOrNull { it != null && it != WINBACK }
        if (returning && WINBACK in offerIds) return WINBACK
        return null
    }

    fun upsellDue(startedTrial: Boolean, shownBefore: Boolean): Boolean = startedTrial && !shownBefore

    fun upgradeFrom(target: String, currentSubscription: String?): String? =
        if (target == Plan.FAMILY && currentSubscription != null && currentSubscription != Plan.FAMILY) currentSubscription else null
}
