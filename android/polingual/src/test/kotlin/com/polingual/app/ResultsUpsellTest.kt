package com.polingual.app

import foundation.bucket.core.auth.Stage
import kotlin.test.Test
import kotlin.test.assertEquals

class ResultsUpsellTest {
    @Test
    fun guestsGetSaveAndLearn() {
        assertEquals(ResultsCta(save = true, learn = true), ResultsUpsell.of(Stage.SignedOut, Access.Locked))
    }

    @Test
    fun signedInFreePlayersGetOnlyLearn() {
        assertEquals(ResultsCta(save = false, learn = true), ResultsUpsell.of(Stage.SignedIn, Access.Locked))
    }

    @Test
    fun subscribersGetNeither() {
        assertEquals(ResultsCta(save = false, learn = false), ResultsUpsell.of(Stage.SignedIn, Access.Subscribed(Plan.YEARLY)))
        assertEquals(ResultsCta(save = false, learn = false), ResultsUpsell.of(Stage.SignedIn, Access.Trial(Plan.MONTHLY)))
    }

    @Test
    fun nothingShowsWhileStateLoads() {
        assertEquals(ResultsCta(save = false, learn = false), ResultsUpsell.of(Stage.Loading, Access.Checking))
    }
}
