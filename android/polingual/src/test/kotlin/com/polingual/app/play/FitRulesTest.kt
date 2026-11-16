package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class FitRulesTest {
    private val measure = { word: String, sp: Float -> (word.length * sp * 0.6f).toInt() }

    @Test
    fun shortWordsKeepTheMaximumSize() = assertEquals(FitRules.MAX_SP to false, FitRules.pick(100, measure, "pan"))

    @Test
    fun longWordsShrinkToFitOnOneLine() {
        val (s, ellipsize) = FitRules.pick(70, measure, "vêtements")
        assertTrue(s < FitRules.MAX_SP && s >= FitRules.MIN_SP)
        assertTrue(measure("vêtements", s) <= 70)
        assertFalse(ellipsize)
    }

    @Test
    fun wordsWiderThanTheFloorEllipsizeAtTheMinimumSize() {
        val (s, ellipsize) = FitRules.pick(40, measure, "Handschuhe")
        assertEquals(FitRules.MIN_SP, s)
        assertTrue(ellipsize)
    }

    @Test
    fun labelsClampInsideTheCanvas() {
        assertEquals(54f, FitRules.clampCenter(-30f, 100f, 400f))
        assertEquals(346f, FitRules.clampCenter(390f, 100f, 400f))
        assertEquals(200f, FitRules.clampCenter(200f, 100f, 400f))
        assertEquals(50f, FitRules.clampCenter(10f, 120f, 100f))
    }
}
