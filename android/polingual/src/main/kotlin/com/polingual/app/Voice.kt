package com.polingual.app

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import foundation.bucket.core.model.Lang
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

interface SpeechEngine {
    val ready: Boolean
    fun voices(): Set<String>
    fun speak(text: String, tag: String, id: String): Boolean
}

sealed interface SpeakResult {
    data object Started : SpeakResult
    data object Waiting : SpeakResult
    data object Muted : SpeakResult
    data class Unavailable(val reason: String) : SpeakResult
}

class VoiceController(private val engine: SpeechEngine, private val now: () -> Long, private val silent: () -> Boolean) {
    private var cached: Set<String> = emptySet()
    private var pending: Triple<String, String, Long>? = null
    private val ids = AtomicLong()
    private val _problem = MutableStateFlow<String?>(null)
    val problem: StateFlow<String?> = _problem
    val taps = mutableMapOf<String, Long>()

    fun voices(): Set<String> {
        if (cached.isEmpty() && engine.ready) cached = engine.voices()
        return cached
    }

    fun available(lang: String): Boolean = Lang.bcp47(lang).let { tag -> voices().any { it.equals(tag, true) || it.substringBefore('-').equals(tag.substringBefore('-'), true) } }

    fun speak(text: String, lang: String, auto: Boolean = false): SpeakResult {
        if (auto && silent()) return SpeakResult.Muted
        val tag = Lang.bcp47(lang)
        if (!engine.ready) {
            pending = Triple(text, tag, now())
            _problem.value = "Voices are still loading. Your word plays as soon as they are ready."
            return SpeakResult.Waiting
        }
        if (voices().isNotEmpty() && !available(lang)) {
            _problem.value = "This device has no ${Lang.name(lang)} voice. Add one in Android settings, Text-to-speech."
            return SpeakResult.Unavailable(_problem.value!!)
        }
        return start(text, tag, now())
    }

    private fun start(text: String, tag: String, tappedAt: Long): SpeakResult {
        val id = "u${ids.incrementAndGet()}"
        taps[id] = tappedAt
        if (!engine.speak(text, tag, id)) {
            _problem.value = "The voice did not start. Tap again."
            return SpeakResult.Unavailable(_problem.value!!)
        }
        _problem.value = null
        return SpeakResult.Started
    }

    fun onReady() {
        cached = emptySet()
        voices()
        pending?.let { (t, tag, at) -> pending = null; start(t, tag, at) }
        if (pending == null && _problem.value?.startsWith("Voices are still loading") == true) _problem.value = null
    }

    fun onStarted(id: String): Long? = taps.remove(id)?.let { now() - it }

    fun checkSlow(limitMs: Long = 300) {
        val p = pending ?: return
        if (now() - p.third >= limitMs) _problem.value = "Voices are still loading. Your word plays as soon as they are ready."
    }
}

class Voice(context: Context, silent: () -> Boolean) {
    private var tts: TextToSpeech? = null
    private var isReady = false
    private val engine = object : SpeechEngine {
        override val ready get() = isReady
        override fun voices(): Set<String> = runCatching { tts?.voices?.map { it.locale.toLanguageTag() }?.toSet() }.getOrNull().orEmpty()
        override fun speak(text: String, tag: String, id: String): Boolean {
            val t = tts ?: return false
            t.language = Locale.forLanguageTag(tag)
            return t.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) == TextToSpeech.SUCCESS
        }
    }
    val controller = VoiceController(engine, { android.os.SystemClock.elapsedRealtime() }, silent)
    val problem: StateFlow<String?> get() = controller.problem
    val lastTapToStartMs = MutableStateFlow<Long?>(null)

    init {
        val app = context.applicationContext
        tts = TextToSpeech(app) { status ->
            isReady = status == TextToSpeech.SUCCESS
            if (isReady) {
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(id: String) {
                        controller.onStarted(id)?.let { ms -> lastTapToStartMs.value = ms; Log.i("PolingualVoice", "tapToStart=${ms}ms") }
                    }
                    override fun onDone(id: String) {}
                    @Deprecated("Deprecated in Java") override fun onError(id: String) {}
                })
                controller.onReady()
            }
        }
    }

    fun available(lang: String): Boolean = controller.available(lang)

    fun speak(text: String, lang: String, auto: Boolean = false): SpeakResult = controller.speak(text, lang, auto)
}
