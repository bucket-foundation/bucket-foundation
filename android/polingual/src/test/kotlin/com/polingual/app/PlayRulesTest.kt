package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PlayRulesTest {
    @Test
    fun unlockedAccessGoesToLearn() {
        listOf(Access.Beta, Access.Trial(Plan.YEARLY), Access.Subscribed(Plan.MONTHLY)).forEach {
            assertEquals(Tab.Learn.route, PlayRules.startLearningRoute(it))
        }
    }

    @Test
    fun lockedOrCheckingGoesToPaywall() {
        assertEquals(PlayRules.PAYWALL, PlayRules.startLearningRoute(Access.Locked))
        assertEquals(PlayRules.PAYWALL, PlayRules.startLearningRoute(Access.Checking))
    }

    @Test
    fun revealStaysHiddenDuringAnOpenRound() = assertFalse(PlayRules.showReveal(answered = false, roundClosed = false))

    @Test
    fun revealShowsAfterAnAnswerOrWhenTheRoundCloses() {
        assertTrue(PlayRules.showReveal(answered = true, roundClosed = false))
        assertTrue(PlayRules.showReveal(answered = false, roundClosed = true))
    }
}
