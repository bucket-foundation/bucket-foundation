package com.polingual.app

import foundation.bucket.core.auth.MemoryKeyValue
import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.model.LangSystem
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.LocalDateTime
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
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
        assertNull(ReminderPlan.riskFire(at(21), 8 * 60, 3, false, utc))
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

    class Fake(var status: Int? = 200) : BetaTransport {
        val calls = mutableListOf<Triple<String, String, JsonElement>>()
        override suspend fun send(method: String, path: String, token: String, body: JsonElement): Int? { calls += Triple(method, path, body); return status }
    }

    @Test
    fun pushRegistersAgainstAcademyEndpoint() = runTest {
        val t = Fake()
        val r = PushRegistry(t, MemoryKeyValue())
        r.received("fcm-token", "bearer")
        val (m, p, b) = t.calls.single()
        assertEquals("POST" to PushRegistry.PATH, m to p)
        assertEquals("com.polingual.app", (b as JsonObject)["bundleId"]!!.jsonPrimitive.content)
    }

    @Test
    fun failedUnregisterIsRetriedForSameUserAndReRegisteredForAnother() = runTest {
        val t = Fake(500)
        val kv = MemoryKeyValue()
        val r = PushRegistry(t, kv)
        r.received("d1", null)
        r.unregister("u1", "b")
        assertNotNull(r.pending())
        t.status = 200
        r.retryPending("u1", "b")
        assertEquals("DELETE", t.calls.last().first)
        assertNull(r.pending())
        r.unregister("u1", null)
        r.retryPending("u2", "b")
        assertEquals("POST", t.calls.last().first)
        assertNull(r.pending())
    }

    @Test
    fun pushConfigNeedsEveryField() {
        assertNull(PushConfig.of("a", "", "c", "d"))
        assertNotNull(PushConfig.of("a", "b", "c", "d"))
    }

    @Test
    fun registrationBacksOffExponentiallyUpToADay() = runTest {
        assertEquals(60_000L, PushRegistry.backoff(1))
        assertEquals(240_000L, PushRegistry.backoff(3))
        assertEquals(86_400_000L, PushRegistry.backoff(30))
        val t = Fake(500)
        val r = PushRegistry(t, MemoryKeyValue())
        r.received("tok", "b", nowMs = 0)
        r.received("tok", "b", nowMs = 30_000)
        assertEquals(1, t.calls.size)
        r.received("tok", "b", nowMs = 60_000)
        assertEquals(2, t.calls.size)
        assertEquals(2, r.failures)
        t.status = 200
        r.received("tok2", "b", nowMs = 60_001)
        assertEquals(0, r.failures)
        assertEquals("android", (t.calls.last().third as JsonObject)["platform"]!!.jsonPrimitive.content)
        assertNull((t.calls.last().third as JsonObject)["env"])
    }
}
