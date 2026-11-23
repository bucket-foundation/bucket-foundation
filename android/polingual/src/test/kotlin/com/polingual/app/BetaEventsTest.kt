package com.polingual.app

import foundation.bucket.core.auth.MemoryKeyValue
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BetaEventsTest {
    class Fake(var status: Int? = 200) : BetaTransport {
        val calls = mutableListOf<Pair<String, JsonElement>>()
        override suspend fun send(method: String, path: String, token: String, body: JsonElement): Int? { calls += path to body; return status }
    }

    private fun ev(n: String = "app_open") = BetaEvent.make(n, "s1")

    @Test
    fun flushSendsInBatchesOfHundred() = runTest {
        val t = Fake()
        val b = BetaEvents("polingual", t, MemoryKeyValue())
        repeat(250) { b.log(ev(), "u1") }
        assertEquals(BetaFlush(250, 0), b.flush("tok", "u1"))
        assertEquals(listOf(100, 100, 50), t.calls.map { ((it.second as JsonObject)["events"]!!).jsonArray.size })
        assertEquals("api/beta/events", t.calls[0].first)
    }

    @Test
    fun serverErrorKeepsQueue() = runTest {
        val t = Fake(500)
        val b = BetaEvents("polingual", t, MemoryKeyValue())
        b.log(ev(), "u1")
        assertEquals(BetaFlush(0, 1), b.flush("tok", "u1"))
    }

    @Test
    fun badRequestDropsBatch() = runTest {
        val b = BetaEvents("polingual", Fake(400), MemoryKeyValue())
        b.log(ev(), "u1")
        assertEquals(BetaFlush(0, 0), b.flush("tok", "u1"))
    }

    @Test
    fun optOutClearsAndBlocks() = runTest {
        val t = Fake()
        val kv = MemoryKeyValue()
        val b = BetaEvents("polingual", t, kv)
        b.log(ev(), "u1")
        b.setOptedOut(true, null)
        b.log(ev(), "u1")
        assertEquals(0, b.pending)
        b.flush("tok", "u1")
        assertEquals("api/beta/opt-out", t.calls.single().first)
        assertEquals(null, kv.get(BetaEvents.PENDING_KEY))
    }

    @Test
    fun ownerChangeDropsQueue() = runTest {
        val b = BetaEvents("polingual", Fake(), MemoryKeyValue())
        b.log(ev(), "u1")
        b.log(ev(), "u2")
        assertEquals(1, b.pending)
    }

    @Test
    fun queueSurvivesRestartAndCaps() = runTest {
        val kv = MemoryKeyValue()
        val b = BetaEvents("polingual", Fake(), kv)
        repeat(BetaEvents.MAX_QUEUE + 5) { b.log(ev(), "u1") }
        assertEquals(BetaEvents.MAX_QUEUE, BetaEvents("polingual", Fake(), kv).pending)
    }

    @Test
    fun answeredPropsMatchIos() {
        val p = BetaEvent.answeredProps("d", true, 900, "recognize", "cloze", true)
        assertEquals(setOf("deck", "correct", "ms", "kind", "question_kind", "applied"), p.keys)
        assertTrue(BetaEvent.make("x", null, mapOf("s" to "a".repeat(300))).props["s"]!!.content.length == 128)
    }
}
