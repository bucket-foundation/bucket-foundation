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
    fun coldStartPlaysOnlyTheLatestTapOnceReady() {
        val e = FakeEngine().apply { isReady = false }
        val v = VoiceController(e, { clock }, silent = { false })
        assertIs<SpeakResult.Waiting>(v.speak("chat", "fr"))
        assertIs<SpeakResult.Waiting>(v.speak("chien", "fr"))
        clock = 250
        e.isReady = true
        v.onReady()
        assertEquals(listOf("chien"), e.spoken.map { it.substringBefore('@') })
        v.onReady()
        assertEquals(1, e.spoken.size)
        clock = 280
        assertEquals(280L, v.onStarted(e.spoken.single().substringAfter('#')))
    }

    @Test
    fun aSlowStartShowsTheReasonAfterThreeHundredMilliseconds() {
        val e = FakeEngine().apply { isReady = false }
        val v = VoiceController(e, { clock }, silent = { false })
        v.speak("chat", "fr")
        clock = 299
        v.checkSlow()
        assertNull(v.problem.value)
        clock = 300
        v.checkSlow()
        assertTrue(v.problem.value!!.contains("loading"))
        e.isReady = true
        v.onReady()
        assertNull(v.problem.value)
    }

    @Test
    fun eachPlayIsOneWordInOneLanguage() {
        val e = FakeEngine()
        val v = VoiceController(e, { clock }, silent = { false })
        v.speak("perro", "es")
        v.speak("chien", "fr")
        assertEquals(listOf("perro@es-ES", "chien@fr-FR"), e.spoken.map { it.substringBefore('#') })
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

class SoundRulesTest {
    @Test
    fun soundOnlyGamesShowTheNeedsSoundCardOnlyWhenSilent() {
        assertTrue(SoundRules.needsSoundCard(silent = true, soundOnly = GameKind.Voice in SoundRules.soundOnlyGames))
        assertTrue(SoundRules.needsSoundCard(silent = true, soundOnly = GameKind.Letters in SoundRules.soundOnlyGames))
        assertFalse(SoundRules.needsSoundCard(silent = true, soundOnly = GameKind.Daily in SoundRules.soundOnlyGames))
        assertFalse(SoundRules.needsSoundCard(silent = false, soundOnly = true))
    }

    @Test
    fun aSessionOfOnlySoundQuestionsSaysSo() {
        assertTrue(SoundRules.onlySoundLeft(silent = true, remaining = 0, deferred = 3))
        assertFalse(SoundRules.onlySoundLeft(silent = true, remaining = 2, deferred = 3))
        assertFalse(SoundRules.onlySoundLeft(silent = false, remaining = 0, deferred = 3))
    }
}
