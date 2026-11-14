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
fun SpeedMatch(graph: Graph, c: GameContext) {
    val game = remember { DailySpeed(DailyGames.speedDeck(GameDeck(c.corpus, c.system.root, c.system.targets), dayKey(), c.system.targets), DailyGames.speedBoardSeed(dayKey())) }
    var left by remember { mutableDoubleStateOf(DailySpeed.SECONDS.toDouble()) }
    var misses by remember { mutableIntStateOf(0) }
    var tick by remember { mutableIntStateOf(0) }
    var over by remember { mutableStateOf(false) }
    val p = LocalPalette.current
    tick.let { }
    LaunchedEffect(game) {
        while (left - misses * DailySpeed.MISS_PENALTY > 0 && game.hits < DailyGames.SPEED_PAIRS && game.playable) { delay(100); left -= 0.1 }
        over = true
        graph.markPlayed(GameKind.Match, c.system, "1".repeat(minOf(game.hits, DailyGames.SPEED_PAIRS))) { day, at -> DailyResults.speed(day, game.seen, game.missed, game.hits, DailyGames.SPEED_PAIRS, at) }
    }
    val remaining = maxOf(0.0, left - misses * DailySpeed.MISS_PENALTY)
    if (over) {
        Finished("${game.hits} pairs", "${game.points} points, ${game.missed.size} misses, best run ${game.bestCombo}. New board tomorrow.", List(game.hits) { true }, DailyGames.SPEED_PAIRS, null)
        game.missed.firstOrNull()?.let { w -> WordReveal(w.lang, w.form, w.gloss, w.itemId, c.corpus) { graph.voice.speak(w.form, w.lang) } }
        return
    }
    LinearProgressIndicator(progress = { (remaining / DailySpeed.SECONDS).toFloat() }, modifier = Modifier.fillMaxWidth(), color = PL.Malachite)
    Text("${remaining.toInt()} s   ${game.hits} of ${DailyGames.SPEED_PAIRS} pairs   ${game.points} points", color = p.muted)
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            game.meanings.forEach { w -> if (w == null) Box(Modifier.fillMaxWidth().heightIn(min = 64.dp)) else MatchTile(w.gloss, game.pickedMeaning == w.id) { game.tapMeaning(w.id).also { if (it is DailySpeed.Outcome.Missed) misses += 1 }; tick += 1 } }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            game.forms.forEach { w -> if (w == null) Box(Modifier.fillMaxWidth().heightIn(min = 64.dp)) else MatchTile("${Lang.flag(w.lang)} ${w.form}", game.pickedForm == w.id) { graph.voice.speak(w.form, w.lang, auto = true); game.tapForm(w.id).also { if (it is DailySpeed.Outcome.Missed) misses += 1 }; tick += 1 } }
        }
    }
}

@Composable
fun MatchTile(text: String, selected: Boolean, onClick: () -> Unit) {
    val p = LocalPalette.current
    Box(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(RoundedCornerShape(14.dp)).background(if (selected) PL.Lapis else p.card)
            .border(1.dp, p.rule, RoundedCornerShape(14.dp)).clickable(role = Role.Button, onClick = onClick).padding(10.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, color = if (selected) PL.Paper else p.ink, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center) }
}
