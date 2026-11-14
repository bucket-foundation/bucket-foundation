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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Mini(graph: Graph, c: GameContext) {
    val p = LocalPalette.current
    val puzzle = remember { MiniPuzzle.daily(c.puzzleWords, dayKey(), c.system.root, c.system.targets) }
    if (puzzle == null) { Text("Learn a few more words to unlock today's crossword.", color = p.muted); return }
    val filled = remember { mutableStateMapOf<MiniCell, String>() }
    var entry by remember { mutableStateOf(puzzle.entries.first()) }
    var cursor by remember { mutableIntStateOf(0) }
    val answers = puzzle.answers
    val solved = answers.all { (k, v) -> filled[k] == v }
    LaunchedEffect(solved) { if (solved) graph.markPlayed(GameKind.Mini, c.system, "1") { day, at -> DailyResults.mini(day, puzzle.entries, puzzle.entries.map { e -> e.cells.zip(e.letters).all { (cell, l) -> filled[cell] == l } }, at) } }
    Text("${Lang.flag(puzzle.lang)} ${Lang.name(puzzle.lang)}", style = Type.caps, color = p.muted)
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        for (r in 0 until puzzle.rows) Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            for (col in 0 until puzzle.cols) {
                val cell = MiniCell(r, col)
                val live = cell in answers
                val active = cell == entry.cells.getOrNull(cursor)
                Box(
                    Modifier.size(46.dp).clip(RoundedCornerShape(6.dp)).background(if (!live) PL.TyrianDeep else if (active) PL.LapisSoft else PL.White)
                        .then(if (live) Modifier.border(1.dp, if (active) PL.Vermilion else p.rule, RoundedCornerShape(6.dp)).clickable {
                            val e = puzzle.entries.firstOrNull { it.cells.contains(cell) && it.across == entry.across } ?: puzzle.entries.first { it.cells.contains(cell) }
                            entry = e; cursor = e.cells.indexOf(cell)
                        } else Modifier),
                    contentAlignment = Alignment.Center,
                ) {
                    if (live) {
                        puzzle.numbers[cell]?.let { Text("$it", fontSize = 9.sp, color = p.muted, modifier = Modifier.align(Alignment.TopStart).padding(2.dp)) }
                        Text(filled[cell].orEmpty(), fontWeight = FontWeight.Bold, color = if (solved) PL.Malachite else p.ink, fontSize = 20.sp)
                    }
                }
            }
        }
    }
    Text("${entry.number}${if (entry.across) " across" else " down"}: ${entry.word.gloss}", color = p.ink, fontWeight = FontWeight.Bold)
    if (solved) {
        Finished("Solved", "New crossword tomorrow.", listOf(true), 1, null)
        puzzle.entries.forEach { e -> CardRoot.mini(e)?.let { t -> com.polingual.app.play.WordLine(e.word.lang, e.word.form, "${Lang.name(t.lang)}: ${t.text}") } }
        return
    }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        (puzzle.keys + "⌫").forEach { k ->
            Box(Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)).background(p.card).border(1.dp, p.rule, RoundedCornerShape(8.dp)).clickable(role = Role.Button) {
                if (k == "⌫") {
                    entry.cells.getOrNull(cursor)?.let { filled.remove(it) }
                    if (cursor > 0) cursor -= 1
                } else {
                    entry.cells.getOrNull(cursor)?.let { filled[it] = k }
                    if (cursor < entry.cells.size - 1) cursor += 1 else {
                        val i = puzzle.entries.indexOf(entry)
                        entry = puzzle.entries[(i + 1) % puzzle.entries.size]; cursor = 0
                    }
                }
            }, contentAlignment = Alignment.Center) { Text(k, fontWeight = FontWeight.Bold, color = p.ink) }
        }
    }
    PlainLink("Reveal word") { entry.cells.zip(entry.letters).forEach { (cell, l) -> filled[cell] = l } }
}
