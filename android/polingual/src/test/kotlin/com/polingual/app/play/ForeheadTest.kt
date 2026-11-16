package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ForeheadTest {
    @Test
    fun floorScoresCeilingPassesUprightWaits() {
        assertEquals(Tilt.Score, TiltRules.classify(-8.0))
        assertEquals(Tilt.Pass, TiltRules.classify(8.0))
        assertNull(TiltRules.classify(1.0))
        assertNull(TiltRules.classify(null))
        assertTrue(TiltRules.settled(2.0))
        assertFalse(TiltRules.settled(5.0))
        assertFalse(TiltRules.settled(null))
    }

    @Test
    fun deckHasUniqueMeaningsInTheChosenLanguages() {
        val d = ForeheadDeck.deck(TestCorpus.corpus.items, listOf("es", "fr"), "42")
        assertEquals(ForeheadDeck.CARDS, d.size)
        assertTrue(d.all { it.lang in setOf("es", "fr") && it.form != it.meaning && it.form.length <= 24 })
        assertEquals(d.size, d.map { it.meaning.lowercase() }.toSet().size)
        assertEquals(d, ForeheadDeck.deck(TestCorpus.corpus.items, listOf("es", "fr"), "42"))
    }
}
