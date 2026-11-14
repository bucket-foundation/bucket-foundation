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

data class GameContext(val system: LangSystem, val app: AppState, val corpus: LangCorpus, val words: List<GameWord>) {
    val puzzleWords: List<GameWord> by lazy {
        val seen = words.map { it.id }.toSet()
        words + foundation.bucket.core.engine.GameWords.starter(system.root, system.targets, corpus, perLang = 80).filter { it.id !in seen }
    }
}

@Composable
fun WithGame(graph: Graph, kind: GameKind, back: () -> Unit, content: @Composable (GameContext) -> Unit) {
    var ctx by remember { mutableStateOf<GameContext?>(null) }
    LaunchedEffect(Unit) {
        val app = graph.store.current()
        val system = app.system ?: return@LaunchedEffect
        val corpus = graph.corpus.load()
        ctx = GameContext(system, app, corpus, GameWordPool.words(system, app, corpus))
    }
    GameScaffold(graph, kind.title, kind.art, kind.tilt, "kente", kind in SoundRules.soundOnlyGames, back, banner = { GameBanner(kind) }) {
        val c = ctx
        if (c != null) {
            Text("${kind.title.uppercase()} · ${c.system.targets.joinToString(" ") { Lang.name(it) }.uppercase()} · ${dayKey()}", style = Type.caps, color = PL.Vermilion)
            Text(kind.blurb, style = Type.small, color = PL.InkDim)
        }
        if (c == null) EmptyState("kente", "Start a language set in Learn. The games use the words you study.") else content(c)
    }
}

suspend fun Graph.markPlayed(kind: GameKind, system: LangSystem, pattern: String, result: ((String, Long) -> DailyResult)? = null) {
    ads.gameFinished()
    kind.daily()?.let { g -> if (dailyResult(g) == null && result != null) recordDaily(result(dayKey(), System.currentTimeMillis())) }
    val key = "${kind.route}|${today()}|${system.id}"
    store.update { it.copy(played = (it.played + (key to pattern)).entries.toList().takeLast(200).associate { e -> e.key to e.value }, savePrompt = account.stage.value != foundation.bucket.core.auth.Stage.SignedIn) }
}


@Composable
fun GameScreen(graph: Graph, kind: GameKind, back: () -> Unit) {
    val book by graph.daily.collectAsState()
    val played = remember { kind.daily()?.let { book[DailyBook.key(it, dayKey())] } }
    WithGame(graph, kind, back) { c ->
        val today = played
        if (today != null) { DoneToday(kind, today); return@WithGame }
        val silentNow by graph.silent.collectAsState()
        if (SoundRules.needsSoundCard(silentNow, kind in SoundRules.soundOnlyGames)) { NeedsSound(graph, kind.title); return@WithGame }
        when (kind) {
            GameKind.Daily -> Quiz(graph, kind, c) { GameRounds.daily(GameDeck(c.corpus, c.system.root, c.system.targets), dayKey()) }
            GameKind.Same -> Quiz(graph, kind, c) { GameRounds.sameWord(GameDeck(c.corpus, c.system.root, c.system.targets), c.words, SeededRandom(System.nanoTime().toULong())) }
            GameKind.Flags -> Quiz(graph, kind, c) { GameRounds.flags(c.words, c.system.targets, PromptMode.Flag, sameForm = GameWordPool.sameForm(c.corpus), rng = SeededRandom(System.nanoTime().toULong())) }
            GameKind.Voice -> Quiz(graph, kind, c) {
                foundation.bucket.core.engine.DailyGames.voicePrompts(GameDeck(c.corpus, c.system.root, c.system.targets), dayKey(), c.system.targets) { w, l -> l != w.lang && GameWordPool.sameForm(c.corpus)(w, l) }
            }
            GameKind.Match -> SpeedMatch(graph, c)
            GameKind.WordGroups -> Groups(graph, c)
            GameKind.Mini -> Mini(graph, c)
            GameKind.Letters -> Letters(graph, c)
        }
    }
}

@Composable
fun Finished(title: String, line: String, results: List<Boolean>, total: Int, again: (() -> Unit)?) = ResultBlock(title, line, results to total, again)

@Composable
fun DoneToday(kind: GameKind, r: DailyResult) {
    Text("Done today", style = Type.display, color = PL.Ink)
    Text("${r.score} of ${r.total}. A new ${kind.title} comes tomorrow.", style = Type.body, color = PL.InkDim)
    ResultDots(r.pattern.map { it == '1' }, r.pattern.length)
    PLButton("Start learning", variant = ButtonVariant.Secondary, onClick = LocalStartLearning.current)
}
