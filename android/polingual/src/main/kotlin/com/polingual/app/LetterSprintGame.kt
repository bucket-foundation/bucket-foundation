package com.polingual.app

import androidx.compose.runtime.collectAsState
import foundation.bucket.core.ui.pl.*
import foundation.bucket.core.engine.DailyGames
import foundation.bucket.core.engine.DailySpeed
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.data.AppState
import foundation.bucket.core.engine.GameDeck
import foundation.bucket.core.engine.GamePrompt
import foundation.bucket.core.engine.GameRounds
import foundation.bucket.core.engine.GameSeed
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.MiniCell
import foundation.bucket.core.engine.MiniPuzzle
import foundation.bucket.core.engine.PromptMode
import foundation.bucket.core.engine.QuizRound
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.SpeedBoard
import foundation.bucket.core.engine.WordGroupsPuzzle
import foundation.bucket.core.engine.WordGroupsRound
import foundation.bucket.core.engine.mixed
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.LangSystem
import foundation.bucket.core.ui.pl.ChoiceButton
import foundation.bucket.core.ui.pl.ChoiceState
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.FlagTile
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.ResultDots
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun Letters(graph: Graph, c: GameContext) {
    val p = LocalPalette.current
    val prompts = remember { com.polingual.app.play.PlayAssets.alphabets(graph.context).let { (heritage, letters) -> DailyGames.letters(dayKey(), c.system.targets, letters, heritage) } }
    if (prompts.isEmpty()) { Text("Letter Sprint needs a language with its own letters, like Greek, Russian or Japanese.", color = p.muted); return }
    var index by remember { mutableIntStateOf(0) }
    val results = remember { mutableStateOf(listOf<Boolean>()) }
    var picked by remember { mutableStateOf<String?>(null) }
    var left by remember { mutableDoubleStateOf(DailyGames.LETTER_SECONDS.toDouble()) }
    LaunchedEffect(Unit) { while (left > 0 && index < prompts.size) { delay(100); left -= 0.1 } }
    if (index >= prompts.size || left <= 0) {
        LaunchedEffect(Unit) { graph.markPlayed(GameKind.Letters, c.system, prompts.indices.joinToString("") { if (results.value.getOrNull(it) == true) "1" else "0" }) { day, at -> DailyResults.letters(day, prompts, results.value, at) } }
        Finished("${results.value.count { it }} of ${prompts.size}", "${Lang.name(prompts[0].lang)} letters. New set tomorrow.", results.value, prompts.size, null)
        return
    }
    val q = prompts[index]
    LaunchedEffect(q) { graph.voice.speak(q.ch, q.lang, auto = true) }
    ResultDots(results.value, prompts.size)
    Text("${left.toInt()} s · ${Lang.name(q.lang)}", style = Type.caps, color = p.muted)
    Text("Hear the sound, then find its letter.", color = p.muted)
    PLButton("Play the sound", variant = ButtonVariant.Accent, leading = { Glyph("speaker", null, PL.Paper, Modifier.size(20.dp)) }) { graph.voice.speak(q.ch, q.lang) }
    q.choices.forEach { ch ->
        val state = when { picked == null -> ChoiceState.Idle; ch == q.ch -> ChoiceState.Right; ch == picked -> ChoiceState.Wrong; else -> ChoiceState.Dim }
        ChoiceButton(ch, state) {
            if (picked == null) {
                picked = ch
                results.value = results.value + (ch == q.ch)
            }
        }
    }
    if (PlayRules.showReveal(answered = picked != null, roundClosed = false)) {
        Text("${q.ch} sounds like ${q.sound}", style = Type.title, color = PL.Ink)
        PrimaryButton("Next letter") { picked = null; index += 1 }
    }
}
