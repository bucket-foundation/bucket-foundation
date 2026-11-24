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
fun Quiz(graph: Graph, kind: GameKind, c: GameContext, build: () -> List<GamePrompt>) {
    var seed by remember { mutableIntStateOf(0) }
    val round = remember(seed) { QuizRound(build()) }
    var tick by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val p = LocalPalette.current
    tick.let { }
    if (round.prompts.isEmpty()) { Text("Learn a few more words first.", color = p.muted); return }
    if (round.finished) {
        LaunchedEffect(round) { graph.markPlayed(kind, c.system, round.results.joinToString("") { if (it) "1" else "0" }) { day, at -> DailyResults.quiz(kind.daily() ?: DailyGame.DailySet, day, round.prompts, round.results, at) } }
        Finished("${round.score} of ${round.prompts.size}", "A finished game keeps your streak. Misses come back in study.", round.results, round.prompts.size, if (kind.daily() != null) null else ({ seed += 1 }))
        return
    }
    val prompt = round.current!!
    ResultDots(round.results, round.prompts.size)
    when (prompt.mode) {
        PromptMode.Form -> {
            Text("Which is ${Lang.name(prompt.word.lang)} for", color = p.muted)
            WordCard(prompt.word.lang, prompt.word.gloss)
        }
        PromptMode.Flag -> {
            Text("Which language is this?", color = p.muted)
            WordCard(null, prompt.word.form)
        }
        PromptMode.Voice -> {
            Text("Listen. Which language is it?", color = p.muted)
            LaunchedEffect(prompt) { graph.voice.speak(prompt.word.form, prompt.word.lang, auto = true) }
            PLButton("Play again", variant = ButtonVariant.Accent, leading = { Glyph("speaker", null, PL.Paper, Modifier.size(20.dp)) }) { graph.voice.speak(prompt.word.form, prompt.word.lang) }
        }
    }
    val picked = round.picked
    prompt.choices.forEach { choice ->
        val label = if (prompt.mode == PromptMode.Form) choice else "${Lang.flag(choice)}  ${Lang.name(choice)}"
        val state = when {
            picked == null -> ChoiceState.Idle
            choice == prompt.answer -> ChoiceState.Right
            choice == picked -> ChoiceState.Wrong
            else -> ChoiceState.Dim
        }
        ChoiceButton(label, state) {
            round.answer(choice)
            tick += 1
            graph.voice.speak(prompt.word.form, prompt.word.lang, auto = true)
        }
    }
    if (PlayRules.showReveal(answered = picked != null, roundClosed = false)) {
        WordReveal(prompt.word.lang, prompt.word.form, prompt.word.gloss, prompt.word.itemId, c.corpus) { graph.voice.speak(prompt.word.form, prompt.word.lang) }
        PrimaryButton(if (round.results.size >= round.prompts.size) "See results" else "Next word") { round.advance(); tick += 1 }
    }
}
