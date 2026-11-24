package com.polingual.app

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DailyBookTest {
    private fun r(game: String, day: String, at: Long, score: Int = 3) = DailyResult(game, day, score, 6, "111000", at)

    @Test
    fun firstResultWinsEveryMerge() {
        val a = mapOf("mini|2026-11-13" to r("mini", "2026-11-13", 200, 1))
        val b = mapOf("mini|2026-11-13" to r("mini", "2026-11-13", 100, 5))
        assertEquals(5, DailyBook.merge(a, b).getValue("mini|2026-11-13").score)
        assertEquals(5, DailyBook.merge(b, a).getValue("mini|2026-11-13").score)
    }

    @Test
    fun mergeKeepsTheNewestHundredTwenty() {
        val many = (1..130).associate { "mini|d$it" to r("mini", "d$it", it.toLong()) }
        val kept = DailyBook.merge(many, emptyMap())
        assertEquals(120, kept.size)
        assertTrue("mini|d1" !in kept && "mini|d130" in kept)
    }

    @Test
    fun dayKeyHasNoZeroPadding() {
        assertEquals("2026-11-3", dayKey(java.time.LocalDate.of(2026, 11, 3)))
        assertEquals("2027-1-13", dayKey(java.time.LocalDate.of(2027, 1, 13)))
    }

    @Test
    fun localBookRoundTrips() {
        val b = mapOf(DailyBook.key(DailyGame.SpeedMatch, "2026-11-13") to r("speed-match", "2026-11-13", 9))
        assertEquals(b, DailyBook.decode(DailyBook.encode(b)))
        assertEquals(emptyMap(), DailyBook.decode("{bad"))
    }

    private class FakeRemote(var stored: Map<String, DailyResult>, val failPush: Int = 0) : ProgressRemote {
        var pushes = 0
        override suspend fun pull() = stored
        override suspend fun push(book: Map<String, DailyResult>): Boolean { pushes++; if (pushes <= failPush) return false; stored = book; return true }
    }

    @Test
    fun syncPushesTheMergeAndConfirms() = runTest {
        val remote = FakeRemote(mapOf("mini|2026-11-12" to r("mini", "2026-11-12", 50)))
        val out = DailyBook.sync(remote, mapOf("mini|2026-11-13" to r("mini", "2026-11-13", 60)))!!
        assertEquals(setOf("mini|2026-11-12", "mini|2026-11-13"), out.keys)
        assertEquals(out, remote.stored)
    }

    @Test
    fun syncKeepsTheEarlierRemoteResultAndGivesUpAfterThreeFailedPushes() = runTest {
        val remote = FakeRemote(mapOf("mini|2026-11-13" to r("mini", "2026-11-13", 10, 6)))
        assertEquals(6, DailyBook.sync(remote, mapOf("mini|2026-11-13" to r("mini", "2026-11-13", 20, 1)))!!.getValue("mini|2026-11-13").score)
        val stubborn = FakeRemote(emptyMap(), failPush = 9)
        assertNull(DailyBook.sync(stubborn, mapOf("mini|x" to r("mini", "x", 1))))
        assertEquals(3, stubborn.pushes)
    }
}
