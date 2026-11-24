package com.polingual.app

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.model.LangSystem
import java.time.LocalDateTime
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RemindersTest {
    private val utc = ZoneOffset.UTC
    private fun at(h: Int, m: Int = 0, day: Int = 1) = LocalDateTime.of(2026, 3, day, h, m).toInstant(utc).toEpochMilli()

    @Test
    fun riskTimeClampsBetweenEightAndTen() {
        assertEquals(20 * 60, ReminderPlan.riskTime(8 * 60))
        assertEquals(21 * 60, ReminderPlan.riskTime(20 * 60))
        assertEquals(22 * 60, ReminderPlan.riskTime(23 * 60))
    }

    @Test
    fun riskFiresTonightOrTomorrow() {
        assertEquals(at(20), ReminderPlan.riskFire(at(10), 8 * 60, 3, false, utc))
        assertEquals(at(20, day = 2), ReminderPlan.riskFire(at(10), 8 * 60, 3, true, utc))
        assertEquals(at(20, day = 2), ReminderPlan.riskFire(at(21), 8 * 60, 3, false, utc))
        assertEquals(at(20, day = 2), ReminderPlan.riskFire(at(20), 8 * 60, 3, false, utc))
        assertNull(ReminderPlan.riskFire(at(10), 8 * 60, 0, false, utc))
    }

    @Test
    fun wordOfDayAtNine() {
        assertEquals(at(9), ReminderPlan.nextWordOfDay(at(8), utc))
        assertEquals(at(9, day = 2), ReminderPlan.nextWordOfDay(at(9), utc))
    }

    @Test
    fun trialReminderOneDayBefore() {
        assertEquals(at(10), ReminderPlan.trialFire(at(10, day = 2), at(1)))
        assertNull(ReminderPlan.trialFire(at(10, day = 2), at(11)))
    }

    @Test
    fun usualMinuteIsMedian() {
        assertEquals(19 * 60, ReminderPlan.usualMinute(emptyList()))
        assertEquals(600, ReminderPlan.usualMinute(listOf(900, 600, 300)))
    }

    private fun item(id: String, tier: Double = 1.0) = LangItem(id, ItemKind.Word, tier, 1, "food", id, mapOf("en" to id, "es" to "$id-es"), emptyMap(), null, emptyList(), null, emptyMap())

    @Test
    fun wordOfDayIsStableAndPrefersKnownWords() {
        val corpus = LangCorpus((1..20).map { item("w$it", if (it > 10) 5.0 else 1.0) }, "")
        val sys = LangSystem("s", "n", "en", listOf("es"), 0.0, 0.0)
        val a = ReminderPlan.wordOfDay(sys, corpus, StudyState(), "2026-03-01")
        assertEquals(a, ReminderPlan.wordOfDay(sys, corpus, StudyState(), "2026-03-01"))
        assertEquals(true, a!!.tier <= 2)
        val known = StudyState(cards = (11..17).associate { "es:w$it" to CardState(reps = 1) })
        assertEquals(true, ReminderPlan.wordOfDay(sys, corpus, known, "2026-03-01")!!.id in (11..17).map { "w$it" })
    }
}
