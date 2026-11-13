package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FitRulesTest {
    private val measure = { word: String, sp: Float -> (word.length * sp * 0.6f).toInt() }

    @Test
    fun shortWordsKeepTheMaximumSize() = assertEquals(FitRules.MAX_SP to 1f, FitRules.pick(100, measure, "pan"))

    @Test
    fun longWordsShrinkToFitOnOneLine() {
        val (s, squeeze) = FitRules.pick(70, measure, "vêtements")
        assertTrue(s < FitRules.MAX_SP && s >= FitRules.MIN_SP)
        assertTrue(measure("vêtements", s) <= 70 || squeeze < 1f)
        assertEquals(1f, squeeze)
    }

    @Test
    fun wordsWiderThanTheFloorSqueezeInsteadOfBreaking() {
        val (s, squeeze) = FitRules.pick(40, measure, "Handschuhe")
        assertEquals(FitRules.MIN_SP, s)
        assertTrue(squeeze < 1f && measure("Handschuhe", s) * squeeze <= 40.5f)
    }
}
