package com.polingual.app

import foundation.bucket.core.auth.MemoryKeyValue
import java.time.ZoneOffset
import java.time.ZonedDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TodayPlanTest {
    private val a = TodayItem(TodayItemKind.System, "s1", "Spanish")
    private val b = TodayItem.of(TodayActivity.Listen, "Listen")
    private val c = TodayItem.of(TodayActivity.Alphabet("ja"), "Japanese")

    @Test
    fun activityRefsRoundTrip() {
        assertEquals("content:activity:alphabet:ja", c.id)
        assertEquals(TodayActivity.Alphabet("ja"), c.activity)
        assertEquals(null, TodayActivity.parse("activity:nope:1:2"))
    }

    @Test
    fun adoptStopsOnceCustomized() {
        val p = TodayPlan().adopt(listOf(a)).add(b, 1.0)
        assertTrue(p.customized)
        assertEquals(listOf(a, b), p.adopt(listOf(c)).items)
    }

    @Test
    fun orderAndMove() {
        val p = TodayPlan(items = listOf(a, b, c))
        assertEquals(listOf(c, a, b), p.order(listOf(c.id, c.id), 1.0).items)
        assertEquals(listOf(b, c, a), p.move(a.id, toTop = false, now = 1.0).items)
    }

    @Test
    fun doneResetsOnNewDay() {
        val p = TodayPlan(items = listOf(a)).setDone(a.id, true, "d1", 1.0)
        assertTrue(p.isDone(a.id, "d1"))
        assertFalse(p.isDone(a.id, "d2"))
    }

    @Test
    fun mergeLatestMarkWins() {
        val x = TodayPlan(items = listOf(a, b)).setDone(a.id, true, "d", 1.0)
        val y = TodayPlan(items = listOf(a, b)).setDone(a.id, false, "d", 2.0).setDone(b.id, true, "d", 2.0)
        assertEquals(listOf(b.id), TodayPlan.merge(x, y).done)
        val older = TodayPlan().setDone(a.id, true, "d0", 5.0)
        assertEquals("d0", TodayPlan.merge(older, y).doneDay)
    }

    @Test
    fun statusEvaluation() {
        val noon = ZonedDateTime.of(2026, 3, 1, 12, 30, 0, 0, ZoneOffset.UTC)
        val night = noon.withHour(21)
        assertEquals(TodayStatus.Empty, TodayStatus.evaluate(0, false, 0, 0, noon))
        assertEquals(TodayStatus.Start, TodayStatus.evaluate(0, false, 2, 2, noon))
        assertEquals(TodayStatus.Keep(4, TimeLeft(11, 30)), TodayStatus.evaluate(4, false, 2, 2, noon))
        assertEquals(TodayStatus.AtRisk(4, TimeLeft(2, 30)), TodayStatus.evaluate(4, false, 2, 2, night))
        assertEquals(TodayStatus.Secured(5, 1), TodayStatus.evaluate(5, true, 2, 1, noon))
        assertEquals(TodayStatus.Done(5), TodayStatus.evaluate(5, true, 2, 0, noon))
    }

    @Test
    fun storePersists() {
        val s = TodayPlanStore(MemoryKeyValue())
        s.save(TodayPlan(items = listOf(a)).setDone(a.id, true, "d", 1.0))
        assertTrue(s.load().isDone(a.id, "d"))
    }
}
