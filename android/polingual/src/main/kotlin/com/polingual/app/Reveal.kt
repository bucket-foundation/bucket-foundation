package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.style.TextOverflow
import foundation.bucket.core.ui.pl.PlainLink
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLSpace
import foundation.bucket.core.ui.pl.WordTile

object Scripts {
    private val byLang = mapOf(
        "ru" to "Cyrillic", "el" to "Greek", "grc" to "Greek", "ar" to "Arabic", "fa" to "Arabic", "he" to "Hebrew",
        "hi" to "Devanagari", "sa" to "Devanagari", "ja" to "Japanese", "zh" to "Han", "ko" to "Hangul", "th" to "Thai", "ta" to "Tamil",
    )
    fun of(lang: String) = byLang[lang] ?: "Latin"
}

@Composable
fun WordReveal(lang: String, form: String, gloss: String, itemId: String?, corpus: LangCorpus?, ipa: String? = null, root: String? = null, definition: String? = null, rootLang: String = LocalRootLang.current, onSpeak: (() -> Unit)?) {
    val item = itemId?.let { corpus?.byId?.get(it) }
    WordCard(
        lang, form, ipa = ipa ?: item?.readings?.get(lang)?.let { it.ipa ?: it.roman }, gloss = gloss, onSpeak = onSpeak,
        details = WordDetails(rootLang, gloss, root ?: item?.root, definition ?: item?.note?.takeIf { it.isNotBlank() } ?: gloss),
    )
}

data class WordDetails(val rootLang: String, val translation: String, val root: String?, val definition: String)

@Composable
fun WordCard(lang: String?, word: String, ipa: String? = null, gloss: String? = null, tilt: Float = -2f, onSpeak: (() -> Unit)? = null, details: WordDetails? = null) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(PLSpace.s2)) {
        WordTile(lang, word, ipa = ipa, gloss = gloss, tilt = tilt, onSpeak = onSpeak)
        if (details != null && lang != null) {
            RootLine(details.rootLang, details.translation)
            RevealRow("Language", Lang.name(lang))
            RevealRow("Script", Scripts.of(lang))
            details.root?.takeIf { it.isNotBlank() }?.let { RevealRow("Root", it) }
            RevealRow("Definition", details.definition, capped = true)
        }
    }
}

@Composable
private fun RevealRow(label: String, value: String, capped: Boolean = false) {
    var open by androidx.compose.runtime.saveable.rememberSaveable(value) { mutableStateOf(false) }
    var overflow by remember(value) { mutableStateOf(false) }
    Row(horizontalArrangement = Arrangement.spacedBy(PLSpace.s3)) {
        Text(label.uppercase(), style = Type.caps, color = PL.InkDim, modifier = Modifier.width(96.dp))
        Column(Modifier.weight(1f)) {
            Text(
                value, style = Type.small, color = PL.Ink,
                maxLines = if (capped && !open) RevealLimits.DEFINITION_LINES else Int.MAX_VALUE, overflow = TextOverflow.Ellipsis,
                onTextLayout = { if (capped && !open) overflow = it.hasVisualOverflow },
            )
            if (capped && (overflow || open)) PlainLink(if (open) "Less" else "More") { open = !open }
        }
    }
}

object RevealLimits {
    const val DEFINITION_LINES = 3
}

val LocalRootLang = androidx.compose.runtime.staticCompositionLocalOf { "en" }

@Composable
fun RootLine(rootLang: String, gloss: String) {
    if (gloss.isBlank()) return
    RevealRow("In ${Lang.name(rootLang)}", gloss)
}

data class RootTranslation(val lang: String, val text: String)

object RootTranslations {
    fun of(rootLang: String, gloss: String?): RootTranslation? = gloss?.trim()?.takeIf { it.isNotEmpty() }?.let { RootTranslation(rootLang, it) }
}

object CardRoot {
    fun study(ex: foundation.bucket.core.engine.Exercise) = RootTranslations.of(ex.word.root, ex.word.gloss)
    fun quiz(p: foundation.bucket.core.engine.GamePrompt) = RootTranslations.of(p.word.root, p.word.gloss)
    fun speed(w: foundation.bucket.core.engine.GameWord) = RootTranslations.of(w.root, w.gloss)
    fun groups(g: foundation.bucket.core.engine.WordGroup) = g.words.map { RootTranslations.of(it.root, it.gloss) }
    fun mini(e: foundation.bucket.core.engine.MiniEntry) = RootTranslations.of(e.word.root, e.word.gloss)
    fun flagTile(t: com.polingual.app.play.FlagTile, root: String) = RootTranslations.of(root, t.meaning)
    fun babel(m: com.polingual.app.play.Meaning, root: String) = RootTranslations.of(root, m.meaning)
    fun shift(t: com.polingual.app.play.ShiftTarget, root: String) = RootTranslations.of(root, t.meaning)
    fun snake(w: com.polingual.app.play.FieldWord, root: String) = RootTranslations.of(root, w.meaning)
    fun atlas(r: com.polingual.app.play.AtlasRound, root: String) = RootTranslations.of(root, r.meaning)
    fun forehead(c: com.polingual.app.play.ForeheadCard, root: String) = RootTranslations.of(root, c.meaning)
    fun iSpy(r: com.polingual.app.play.SpyRound, root: String) = RootTranslations.of(root, r.answer)
    fun polyword(p: com.polingual.app.play.PolyPuzzle, root: String) = RootTranslations.of(root, p.gloss)
    fun lobby(e: foundation.bucket.core.model.RevealEntry, root: String) = RootTranslations.of(root, e.meaning.ifBlank { e.gloss })
    fun letter(p: foundation.bucket.core.engine.LetterPrompt, root: String) = RootTranslations.of(root, p.sound)
}
