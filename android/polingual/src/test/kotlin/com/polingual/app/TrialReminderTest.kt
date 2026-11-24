package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TrialReminderTest {
    private val day = TrialReminder.DAY_MS
    private val start = 1_800_000_000_000L
    private fun yearly(renewing: Boolean = true, pending: Boolean = false) = PurchaseRecord(Plan.YEARLY, start, true, pending, renewing)

    @Test
    fun firesTwoDaysBeforeBillingOnDayFive() {
        assertEquals(start + 5 * day, TrialReminder.fireAt(start))
        assertEquals(start + 5 * day, TrialReminder.plan(listOf(yearly()), start, start + day))
    }

    @Test
    fun noReminderAfterTheFireTimeOrWithoutATrial() {
        assertNull(TrialReminder.plan(listOf(yearly()), start, start + 6 * day))
        assertNull(TrialReminder.plan(listOf(yearly()), null, start))
        assertNull(TrialReminder.plan(listOf(yearly()), start + 1, start))
    }

    @Test
    fun cancellingTheTrialDropsTheReminder() {
        assertNull(TrialReminder.plan(listOf(yearly(renewing = false)), start, start + day))
        assertNull(TrialReminder.plan(listOf(yearly(pending = true)), start, start + day))
    }

    @Test
    fun onlyANewEligibleYearlyPurchaseStartsATrial() {
        assertTrue(TrialReminder.startedTrial(yearly(), wasEligible = true, fromPurchase = true))
        assertFalse(TrialReminder.startedTrial(yearly(), wasEligible = false, fromPurchase = true))
        assertFalse(TrialReminder.startedTrial(yearly(), wasEligible = true, fromPurchase = false))
        assertFalse(TrialReminder.startedTrial(PurchaseRecord(Plan.MONTHLY, start, true, false, true), wasEligible = true, fromPurchase = true))
    }
}
