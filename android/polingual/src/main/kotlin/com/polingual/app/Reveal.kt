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
fun WordReveal(lang: String, form: String, gloss: String, itemId: String?, corpus: LangCorpus?, ipa: String? = null, root: String? = null, definition: String? = null, onSpeak: (() -> Unit)?) {
    val item = itemId?.let { corpus?.byId?.get(it) }
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(PLSpace.s2)) {
        WordTile(lang, form, ipa = ipa ?: item?.readings?.get(lang)?.let { it.ipa ?: it.roman }, gloss = gloss, onSpeak = onSpeak)
        RevealRow("Language", Lang.name(lang))
        RevealRow("Script", Scripts.of(lang))
        (root ?: item?.root)?.takeIf { it.isNotBlank() }?.let { RevealRow("Root", it) }
        RevealRow("Definition", definition ?: item?.note?.takeIf { it.isNotBlank() } ?: gloss, capped = true)
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
