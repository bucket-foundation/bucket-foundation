package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SoundTest {
    private class MemKv : KeyValue {
        val m = mutableMapOf<String, String>()
        override fun get(key: String) = m[key]
        override fun set(key: String, value: String?) { if (value == null) m.remove(key) else m[key] = value }
    }

    private class FakeEngine(var list: Set<String> = setOf("es-ES", "fr-FR")) : SpeechEngine {
        var isReady = true
        override val ready get() = isReady
        val spoken = mutableListOf<String>()
        var voiceCalls = 0
        override fun voices(): Set<String> { voiceCalls++; return list }
        override fun speak(text: String, tag: String, id: String): Boolean { spoken += "$text@$tag#$id"; return true }
    }

    private var clock = 0L

    @Test
    fun silentModePersistsAcrossLaunches() {
        val kv = MemKv()
        SilentSetting(kv).set(true)
        assertTrue(SilentSetting(kv).on.value)
        SilentSetting(kv).set(false)
        assertFalse(SilentSetting(kv).on.value)
        assertNull(kv.m[SilentSetting.KEY])
    }

    @Test
    fun silentStopsAutomaticAudioButATapStillPlays() {
        val e = FakeEngine()
        val v = VoiceController(e, { clock }, silent = { true })
        assertEquals(SpeakResult.Muted, v.speak("perro", "es", auto = true))
        assertEquals(SpeakResult.Started, v.speak("perro", "es"))
        assertEquals(1, e.spoken.size)
    }

    @Test
    fun rapidTapsEachStartAndNoneIsDropped() {
        val e = FakeEngine()
        val v = VoiceController(e, { clock }, silent = { false })
        listOf("uno", "dos", "tres", "cuatro").forEach { assertEquals(SpeakResult.Started, v.speak(it, "es")) }
        assertEquals(listOf("uno", "dos", "tres", "cuatro"), e.spoken.map { it.substringBefore('@') })
        assertEquals(4, e.spoken.map { it.substringAfter('#') }.toSet().size)
    }

    @Test
    fun coldStartTapPlaysWhenVoicesArriveAndSaysWhy() {
        val e = FakeEngine().apply { isReady = false }
        val v = VoiceController(e, { clock }, silent = { false })
        assertIs<SpeakResult.Waiting>(v.speak("chat", "fr"))
        assertTrue(v.problem.value!!.contains("loading"))
        assertTrue(e.spoken.isEmpty())
        clock = 250
        e.isReady = true
        v.onReady()
        assertEquals("chat", e.spoken.single().substringBefore('@'))
        assertNull(v.problem.value)
        clock = 280
        assertEquals(280L, v.onStarted(e.spoken.single().substringAfter('#')))
    }

    @Test
    fun anEmptyVoiceListIsNeverCached() {
        val e = FakeEngine(list = emptySet())
        val v = VoiceController(e, { clock }, silent = { false })
        assertTrue(v.voices().isEmpty())
        e.list = setOf("es-ES")
        assertEquals(setOf("es-ES"), v.voices())
        v.voices()
        assertEquals(2, e.voiceCalls)
    }

    @Test
    fun aMissingVoiceGivesTheReason() {
        val v = VoiceController(FakeEngine(), { clock }, silent = { false })
        val r = v.speak("こんにちは", "ja")
        assertIs<SpeakResult.Unavailable>(r)
        assertTrue(r.reason.contains("Japanese"))
    }
}
