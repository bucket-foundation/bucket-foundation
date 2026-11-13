package com.polingual.app

import android.content.Context
import android.speech.tts.TextToSpeech
import foundation.bucket.core.model.Lang
import java.util.Locale

class Voice(context: Context) {
    private var ready = false
    private val tts = TextToSpeech(context.applicationContext) { status -> ready = status == TextToSpeech.SUCCESS }

    fun available(lang: String): Boolean = ready && tts.isLanguageAvailable(Locale.forLanguageTag(Lang.bcp47(lang))) >= TextToSpeech.LANG_AVAILABLE

    fun speak(text: String, lang: String) {
        if (!ready) return
        tts.language = Locale.forLanguageTag(Lang.bcp47(lang))
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, text)
    }
}
