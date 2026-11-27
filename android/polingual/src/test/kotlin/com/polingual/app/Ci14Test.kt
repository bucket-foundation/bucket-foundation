package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.engine.InputExperiment
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.UploadGate
import foundation.bucket.core.engine.YesNoTest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class Ci14Test {
    private class MemKv : KeyValue {
        val m = mutableMapOf<String, String>()
        override fun get(key: String) = m[key]
        override fun set(key: String, value: String?) { if (value == null) m.remove(key) else m[key] = value }
    }

    private class FakeApi(val stored: ExperimentApi.Fetched?, val reply: InputExperiment.Enrolment?) : ExperimentApi {
        val registered = mutableListOf<String>()
        override suspend fun fetch() = stored
        override suspend fun register(stratum: String): InputExperiment.Enrolment? { registered += stratum; return reply }
    }

    private val open = InputExperiment.Consent(true, true, true, false)
    private fun enrolment(arm: String) = InputExperiment.Enrolment(InputExperiment.EXPERIMENT_ID, "acct:u1", arm, "to-a2", 5L)
    private val attempt: (InputExperiment.Consent, InputExperiment.Enrolment?, String?) -> InputExperiment.ExperimentMix? = { c, e, k ->
        InputExperiment.mix(c, e, k, 1, 0, listOf(600.0), 10L)
    }

    @Test fun prefsJoinLeaveAndTaken() {
        val p = Ci14Prefs(MemKv())
        assertFalse(p.disclosed)
        p.join()
        assertTrue(p.disclosed)
        assertFalse(p.optedOut)
        assertEquals(open, p.consent(true, UploadGate.Open))
        assertFalse(p.consent(true, UploadGate.Unknown).uploadOpen)
        p.markTaken("baseline")
        assertTrue(p.taken().baseline)
        assertFalse(p.taken().day28)
        p.markTaken("day28")
        assertTrue(p.taken().day28)
        p.leave()
        assertTrue(p.optedOut)
        assertNull(Ci14.step(p.consent(true, UploadGate.Open), p, 0L))
    }

    @Test fun stepsFollowConsentAndTests() {
        val p = Ci14Prefs(MemKv())
        assertNull(Ci14.step(p.consent(true, UploadGate.Closed), p, 0L))
        assertEquals(Ci14Step.Disclose, Ci14.step(p.consent(true, UploadGate.Open), p, 0L))
        p.join()
        assertEquals(Ci14Step.Test("baseline"), Ci14.step(p.consent(true, UploadGate.Open), p, 0L))
        p.markTaken("baseline")
        p.cache(enrolment("s50"))
        assertNull(Ci14.step(p.consent(true, UploadGate.Open), p, 86_400_000L))
        assertEquals(Ci14Step.Test("day28"), Ci14.step(p.consent(true, UploadGate.Open), p, 5L + 28 * 86_400_000L))
    }

    @Test fun serverArmWins() = runBlocking {
        val p = Ci14Prefs(MemKv()).apply { join(); markTaken("baseline"); cache(enrolment("s50")) }
        val api = FakeApi(ExperimentApi.Fetched(enrolment("s90")), null)
        val out = Ci14.choose(open, p, api, "u1", "d-0", attempt) { it.enrolment }!!
        assertEquals("s90", out.arm)
        assertEquals("s90", p.enrolment()?.arm)
        assertEquals(emptyList(), api.registered)
    }

    @Test fun newEnrolmentTakesTheServerReply() = runBlocking {
        val p = Ci14Prefs(MemKv()).apply { join(); markTaken("baseline") }
        val api = FakeApi(ExperimentApi.Fetched(null), enrolment("s70"))
        val out = Ci14.choose(open, p, api, "u1", "d-0", attempt) { it.enrolment }!!
        assertEquals(listOf("to-a2"), api.registered)
        assertEquals("s70", out.arm)
        assertEquals("s70", p.enrolment()?.arm)
    }

    @Test fun noServerReplyMeansNoArm() = runBlocking {
        val p = Ci14Prefs(MemKv()).apply { join(); markTaken("baseline") }
        val failed = Ci14.choose(open, p, FakeApi(ExperimentApi.Fetched(null), null), "u1", "d-0", attempt) { it.enrolment }!!
        assertNull(failed.arm)
        assertNull(failed.enrolment)
        assertNull(p.enrolment())
        val offline = Ci14.choose(open, p, FakeApi(null, enrolment("s70")), "u1", "d-0", attempt) { it.enrolment }!!
        assertNull(offline.arm)
        val noBaseline = Ci14Prefs(MemKv()).apply { join() }
        assertNull(Ci14.choose(open, noBaseline, FakeApi(ExperimentApi.Fetched(null), enrolment("s70")), "u1", "d-0", attempt) { it.enrolment }!!.arm)
    }

    @Test fun vocabRowScoresAndDays() {
        val items = listOf(YesNoTest.TestItem("casa", true, 0), YesNoTest.TestItem("zel", false, null))
        val r = Ci14.vocabRow("day28", items, setOf("casa"), 61.6, enrolment("s70"), "id", 5L + 29 * 86_400_000L, "d", "UTC", "sys", "es")
        assertEquals("B", r.form)
        assertEquals("s70", r.arm)
        assertEquals(29, r.day)
        assertEquals(62, r.seconds)
        assertEquals(1, r.hits)
        assertEquals(0, r.falseAlarms)
    }

    @Test fun studyLogUploadsUnderTheSharedGate() = runBlocking {
        val kv = MemKv()
        val q = LogQueue(kv, RadioLog.STUDY_KEY, 10)
        val v = LogRow.VocabTest("v1", 1L, "d", "UTC", "sys", "es", "baseline", "A", null, 1, 1, 0, 1, 10.0, 0, 5)
        val s = LogRow.Session("s1", 2L, "d", "UTC", "sys", "es", "sess", 1L, 2L, 0.5, 0.2, null, 1, 3)
        q.append(listOf(v, s, v))
        assertEquals(2, q.rows().size)
        assertEquals(0, q.upload { "no_consent" })
        assertEquals(UploadGate.Closed, RadioLog(kv).gate())
        assertEquals(0, q.upload { error("must not post") })
        kv.set(RadioLog.GATE_KEY, UploadGate.Open.name)
        val posts = mutableListOf<JsonObject>()
        assertEquals(2, q.upload { posts += it; "recorded" })
        assertEquals(listOf("vocab_test", "session_mix"), posts.single()["events"]!!.jsonArray.map { it.jsonObject["name"]!!.jsonPrimitive.content })
        assertEquals(emptyList(), q.rows())
    }

    @Test fun unknownGateProbesFirstAndKeepsRows() = runBlocking {
        val kv = MemKv()
        val q = LogQueue(kv, RadioLog.STUDY_KEY, 10)
        q.append(listOf(LogRow.VocabTest("v1", 1L, "d", "UTC", "sys", "es", "baseline", "A", null, 1, 1, 0, 1, 10.0, 0, 5)))
        val posts = mutableListOf<JsonObject>()
        assertEquals(0, q.upload { posts += it; null })
        assertEquals(1, posts.size)
        assertEquals(1, q.rows().size)
        assertEquals(UploadGate.Unknown, q.gate())
    }
}
