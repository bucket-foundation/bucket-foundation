package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OffersTest {
    private val ids = listOf(null, "free-7d", Offers.WINBACK)

    @Test
    fun newUsersGetTheTrialOfferOnYearly() {
        assertEquals("free-7d", Offers.pick(Plan.YEARLY, ids, trialEligible = true, returning = false))
        assertNull(Offers.pick(Plan.MONTHLY, ids, trialEligible = true, returning = false))
    }

    @Test
    fun returningMembersGetTheWinBackOffer() {
        assertEquals(Offers.WINBACK, Offers.pick(Plan.YEARLY, ids, trialEligible = false, returning = true))
        assertNull(Offers.pick(Plan.YEARLY, listOf(null, "free-7d"), trialEligible = false, returning = true))
        assertNull(Offers.pick(Plan.YEARLY, ids, trialEligible = false, returning = false))
    }

    @Test
    fun familyAndLifetimeShowOnceAfterATrialStarts() {
        assertTrue(Offers.upsellDue(startedTrial = true, shownBefore = false))
        assertFalse(Offers.upsellDue(startedTrial = true, shownBefore = true))
        assertFalse(Offers.upsellDue(startedTrial = false, shownBefore = false))
        assertEquals(listOf(Plan.FAMILY, Plan.LIFETIME), Offers.upsell)
    }

    @Test
    fun familyReplacesTheYearlyTrial() {
        assertEquals(Plan.YEARLY, Offers.upgradeFrom(Plan.FAMILY, Plan.YEARLY))
        assertNull(Offers.upgradeFrom(Plan.LIFETIME, Plan.YEARLY))
        assertNull(Offers.upgradeFrom(Plan.FAMILY, null))
    }
}
