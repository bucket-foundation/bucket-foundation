package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EntitlementTest {
    private fun rec(id: String, at: Long = 1, pending: Boolean = false, trial: Boolean = false) = PurchaseRecord(id, at, true, pending, true, trial)

    @Test
    fun noPurchasesLocks() = assertEquals(Access.Locked, Entitlement.access(emptyList(), beta = false))

    @Test
    fun betaOpensEverything() = assertEquals(Access.Beta, Entitlement.access(emptyList(), beta = true))

    @Test
    fun pendingPurchaseGivesNoAccess() = assertEquals(Access.Locked, Entitlement.access(listOf(rec(Plan.YEARLY, pending = true)), beta = false))

    @Test
    fun lifetimeWinsOverSubscriptions() = assertEquals(Access.Subscribed(Plan.LIFETIME), Entitlement.access(listOf(rec(Plan.MONTHLY, 9), rec(Plan.LIFETIME, 1)), beta = false))

    @Test
    fun unknownProductsAreIgnored() = assertEquals(Access.Locked, Entitlement.access(listOf(rec("other.app.pro")), beta = false))

    @Test
    fun activeServerEntitlementWins() {
        val a = Entitlement.access(emptyList(), beta = false, server = ServerEntitlement(true, Plan.YEARLY, 2_000, trial = true), nowMs = 1_000)
        assertEquals(Access.Trial(Plan.YEARLY), a)
        assertEquals(Access.Locked, Entitlement.access(emptyList(), beta = false, server = ServerEntitlement(true, Plan.YEARLY, 500, false), nowMs = 1_000))
    }

    @Test
    fun trialEligibilityFollowsSubscriptionHistory() {
        assertTrue(Entitlement.trialEligible(listOf(Plan.LIFETIME)))
        assertEquals(false, Entitlement.trialEligible(listOf(Plan.MONTHLY)))
    }

    @Test
    fun disclosureNamesGooglePlayAndRenewal() {
        assertEquals("3 days free, then $9.99 a year. Charged to your Google Play account. Renews automatically until you cancel in Google Play subscriptions.", Entitlement.disclosure(true, "$9.99", "year"))
        assertTrue(Entitlement.disclosure(false, "$49", "once").contains("No subscription"))
    }
}

class AdGateTest {
    @Test
    fun adsOnlyForNonPayingUsersOnceAccessIsKnown() {
        assertEquals(true, AdGate.show(true, Access.Locked))
        assertEquals(false, AdGate.show(true, Access.Subscribed(Plan.YEARLY)))
        assertEquals(false, AdGate.show(true, Access.Trial(Plan.YEARLY)))
        assertEquals(false, AdGate.show(true, Access.Beta))
        assertEquals(false, AdGate.show(true, Access.Checking))
        assertEquals(false, AdGate.show(false, Access.Locked))
    }
}
