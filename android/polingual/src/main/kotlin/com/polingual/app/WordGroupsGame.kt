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
fun Groups(graph: Graph, c: GameContext) {
    val p = LocalPalette.current
    val puzzle = remember { WordGroupsPuzzle.daily(c.puzzleWords, dayKey(), c.system.root, c.system.targets, theme = { c.corpus.byId[it.itemId]?.category }, sameForm = GameWordPool.sameForm(c.corpus)) }
    if (puzzle == null) { Text("Learn a few more words to unlock today's board.", color = p.muted); return }
    val round = remember { WordGroupsRound(puzzle) }
    var tick by remember { mutableIntStateOf(0) }
    var note by remember { mutableStateOf("") }
    tick.let { }
    val colors = listOf(PL.Lapis, PL.Malachite, PL.Vermilion, PL.Ink)
    round.solved.forEachIndexed { i, g ->
        Column(Modifier.fillMaxWidth().plSurface(colors[i % 4], 14.dp).padding(12.dp)) {
            Text(groupTitle(g.link), style = Type.caps, color = PL.Paper)
            Text(g.words.joinToString(", ") { it.form }, color = PL.Paper, fontWeight = FontWeight.Bold)
        }
    }
    if (round.finished) {
        if (!round.won) round.unsolved.forEach { g -> Text("${groupTitle(g.link)}: ${g.words.joinToString(", ") { it.form }}", color = p.muted) }
        LaunchedEffect(Unit) { val pattern = round.results.joinToString("") { if (it) "1" else "0" }; graph.markPlayed(GameKind.WordGroups, c.system, pattern) { day, at -> DailyResults.groups(day, puzzle.groups, round.solved, pattern, at) } }
        Finished(if (round.won) "Solved" else "Out of tries", "${round.mistakes} mistakes. New board tomorrow.", round.results, round.results.size, null)
        puzzle.groups.forEach { g ->
            SectionTitle(groupTitle(g.link))
            g.words.zip(CardRoot.groups(g)).forEach { (w, t) -> com.polingual.app.play.WordLine(w.lang, w.form, t?.let { "${Lang.name(it.lang)}: ${it.text}" } ?: "") }
        }
        return
    }
    round.tiles.chunked(4).forEach { row ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            row.forEach { w ->
                val on = w.id in round.selected
                foundation.bucket.core.ui.pl.PLTile(
                    on, Modifier.weight(1f).aspectRatio(1.1f).semantics { contentDescription = "${w.form}, ${Lang.name(w.lang)}" }, selectedColor = PL.Ink,
                    onClick = { round.toggle(w.id); tick += 1 },
                ) { Text(w.form, color = if (on) PL.Paper else PL.Ink, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, fontSize = 14.sp, maxLines = 2, modifier = Modifier.padding(4.dp)) }
            }
        }
    }
    Text("Mistakes left: ${"●".repeat(round.mistakesLeft)}", color = p.muted)
    if (note.isNotEmpty()) Text(note, color = PL.Vermilion)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        PlainLink("Shuffle") { round.shuffle(SeededRandom(System.nanoTime().toULong())); tick += 1 }
        PlainLink("Deselect") { round.selected.forEach(round::toggle); tick += 1 }
    }
    PrimaryButton("Submit", enabled = round.canSubmit) {
        note = when (round.submit()) {
            WordGroupsRound.Outcome.OneAway -> "One away"
            WordGroupsRound.Outcome.Repeated -> "Already tried"
            WordGroupsRound.Outcome.Miss -> "Not a group"
            else -> ""
        }
        tick += 1
    }
}

fun groupTitle(link: foundation.bucket.core.engine.GroupLink): String = when (link) {
    is foundation.bucket.core.engine.GroupLink.Language -> Lang.name(link.lang)
    is foundation.bucket.core.engine.GroupLink.Theme -> link.theme.replaceFirstChar(Char::uppercase)
    is foundation.bucket.core.engine.GroupLink.LanguageTheme -> "${Lang.name(link.lang)} ${link.theme}"
}
