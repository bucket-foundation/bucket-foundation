package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class FirstLessonTest {
    @Test
    fun aLockedLearnerStudiesOnceThenMeetsThePaywall() {
        assertEquals("study", FirstLesson.startRoute(Access.Locked, done = false))
        assertEquals("Start", FirstLesson.startLabel(Access.Locked, done = false))
        assertEquals("paywall", FirstLesson.startRoute(Access.Locked, done = true))
        assertEquals("Unlock learning", FirstLesson.startLabel(Access.Locked, done = true))
    }

    @Test
    fun subscribersAndTrialsAlwaysStudy() {
        for (a in listOf(Access.Trial("com.polingual.yearly"), Access.Subscribed("com.polingual.monthly"), Access.Beta)) {
            assertEquals("study", FirstLesson.startRoute(a, done = true))
            assertFalse(FirstLesson.paywallAfter(a, done = true))
        }
    }

    @Test
    fun thePaywallFollowsTheFirstLessonOnlyWhenItCounted() {
        assertTrue(FirstLesson.paywallAfter(Access.Locked, done = true))
        assertFalse(FirstLesson.paywallAfter(Access.Locked, done = false))
        assertFalse(FirstLesson.counts(0))
        assertTrue(FirstLesson.counts(1))
    }

    @Test
    fun theFlagReadsFromStorage() {
        assertTrue(FirstLesson.done { if (it == FirstLesson.KEY) "1" else null })
        assertFalse(FirstLesson.done { null })
    }
}
