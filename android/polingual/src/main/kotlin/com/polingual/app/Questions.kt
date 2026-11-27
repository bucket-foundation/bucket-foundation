package com.polingual.app

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.size
import androidx.compose.ui.unit.dp
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.ChoiceButton
import foundation.bucket.core.ui.pl.ChoiceState
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.Glyph
import foundation.bucket.core.ui.pl.PrimaryButton
import java.text.Normalizer

enum class QuestionKind { Choose, Translate, Listen, Reverse, Sound, Letter }

data class Question(
    val kind: QuestionKind,
    val itemId: String,
    val prompt: String,
    val promptLang: String,
    val answer: String,
    val answerLang: String,
    val options: List<String> = emptyList(),
    val accept: List<String> = listOf(answer),
    val speak: String? = null,
    val speakLang: String? = null,
    val hint: String? = null,
) {
    val typed: Boolean get() = kind == QuestionKind.Translate

    fun check(given: String): Boolean = if (typed) accept.any { Answers.matches(given, it, answerLang) } else given == answer
}

object Answers {
    private val articles = Regex("^(el|la|los|las|le|les|il|lo|gli|o|a|os|as|der|die|das|de|het|en|ett|un|une|una|uno|the|to) ", RegexOption.IGNORE_CASE)

    fun normalize(text: String, lang: String): String {
        val base = text.trim().lowercase().replace(Regex("[\\p{P}\\s]+"), " ").trim()
        val latin = foundation.bucket.core.model.Lang.info[lang]?.latin ?: true
        return if (latin) Normalizer.normalize(base, Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "") else base
    }

    fun bare(text: String, lang: String) = normalize(text.replace(articles, "").replace(Regex("^l'", RegexOption.IGNORE_CASE), ""), lang)

    fun matches(given: String, expected: String, lang: String): Boolean {
        val g = normalize(given, lang)
        return g.isNotEmpty() && (g == normalize(expected, lang) || bare(given, lang) == bare(expected, lang))
    }
}

@Composable
fun QuestionView(graph: Graph, q: Question, answered: (Boolean) -> Unit) {
    var picked by remember(q) { mutableStateOf<String?>(null) }
    var typed by remember(q) { mutableStateOf("") }
    var result by remember(q) { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(q) { q.speak?.let { graph.voice.speak(it, q.speakLang ?: q.promptLang) } }
    Card {
        Text(stringResource(when (q.kind) {
            QuestionKind.Choose -> R.string.q_choose
            QuestionKind.Translate -> R.string.q_type
            QuestionKind.Listen -> R.string.q_listen
            QuestionKind.Reverse -> R.string.q_reverse
            QuestionKind.Sound -> R.string.q_sound
            QuestionKind.Letter -> R.string.q_letter
        }), color = PL.InkDim)
        if (q.kind != QuestionKind.Sound) Text(q.prompt, style = Type.word, color = PL.Tyrian)
        q.hint?.let { Text(it, color = PL.InkDim) }
        if (q.speak != null) IconButton(onClick = { graph.voice.speak(q.speak, q.speakLang ?: q.promptLang) }) { Glyph("speaker", stringResource(R.string.q_play), PL.Lapis, Modifier.size(28.dp)) }
    }
    if (q.typed) {
        fun submit() { if (result == null && typed.isNotBlank()) result = q.check(typed) }
        OutlinedTextField(typed, { if (result == null) typed = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.q_answer)) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { submit() }))
        when (val r = result) {
            null -> PrimaryButton(stringResource(R.string.q_check), enabled = typed.isNotBlank()) { submit() }
            else -> {
                Text(if (r) stringResource(R.string.q_right) else stringResource(R.string.q_wrong, q.answer), color = if (r) PL.Malachite else PL.Vermilion)
                PrimaryButton(stringResource(R.string.q_next)) { answered(r) }
            }
        }
    } else {
        q.options.forEach { o ->
            val state = when {
                picked == null -> ChoiceState.Idle
                o == q.answer -> ChoiceState.Right
                o == picked -> ChoiceState.Wrong
                else -> ChoiceState.Dim
            }
            ChoiceButton(o, state) { if (picked == null) picked = o }
        }
        picked?.let { PrimaryButton(stringResource(R.string.q_next)) { answered(q.check(it)) } }
    }
}
