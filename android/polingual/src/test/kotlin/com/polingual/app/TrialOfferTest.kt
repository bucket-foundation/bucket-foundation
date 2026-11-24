package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TrialOfferTest {
    @Test
    fun onlyYearlyCarriesTheSevenDayTrial() {
        assertEquals(7, Plan.TRIAL_DAYS)
        assertTrue(Plan.hasTrial(Plan.YEARLY))
        assertFalse(Plan.hasTrial(Plan.MONTHLY))
        assertFalse(Plan.hasTrial(Plan.FAMILY))
    }

    @Test
    fun yearlyReadsAsAWeeklyPrice() {
        assertEquals("$1.15 a week", Plan.perWeek(59.99))
    }

    @Test
    fun monthlyWaitsBehindSeeAllPlans() {
        val ids = listOf(Plan.MONTHLY, Plan.YEARLY, Plan.FAMILY)
        assertEquals(listOf(Plan.YEARLY), Plan.shown(ids, all = false))
        assertEquals(ids, Plan.shown(ids, all = true))
        assertEquals(listOf(Plan.MONTHLY), Plan.shown(listOf(Plan.MONTHLY), all = false))
    }

    @Test
    fun timelineWarnsTwoDaysBeforeBilling() {
        val steps = Plan.timeline("$59.99 a year")
        assertEquals(listOf("Today", "Day 5", "Day 7"), steps.map { it.first })
        assertTrue(steps[0].second.contains("No payment now"))
    }
}
