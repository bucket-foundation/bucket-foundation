package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FakePlansTest {
    @Test
    fun noFakesUnlessAsked() = assertTrue(FakePlans.offers(emptyList(), fake = false).isEmpty())

    @Test
    fun fakesFillAnEmptyStore() = assertEquals(Plan.paid.toSet(), FakePlans.offers(emptyList(), fake = true).map { it.productId }.toSet())
}
