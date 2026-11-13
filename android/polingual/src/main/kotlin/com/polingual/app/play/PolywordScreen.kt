package com.polingual.app.play

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polingual.app.Graph
import com.polingual.app.Type
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.ButtonSize
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PLPill
import foundation.bucket.core.ui.pl.PLRadius
import foundation.bucket.core.ui.pl.SectionTitle
import foundation.bucket.core.ui.pl.WordTile
import java.time.LocalDate
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer

@Serializable
private data class SavedGame(val guesses: List<String>, val done: Boolean, val won: Boolean)

private fun markColor(m: Mark?) = when (m) { Mark.Hit -> PL.Malachite; Mark.Near -> PL.Ochre; Mark.Miss -> PL.InkFaint; null -> PL.White }

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PolywordScreen(graph: Graph, back: () -> Unit) {
    val context = LocalContext.current
    val bank = remember { PlayAssets.bank(context) }
    val today = remember { Polyword.dayNumber(LocalDate.now()) }
    val saver = MapSerializer(String.serializer(), SavedGame.serializer())
    var lang by remember { mutableStateOf(graph.kv.get("polyword.lang")?.takeIf { bank.langs[it]?.isNotEmpty() == true } ?: "es") }
    var saved by remember { mutableStateOf(graph.kv.get("polyword.games")?.let { runCatching { PlayAssets.json.decodeFromString(saver, it) }.getOrNull() } ?: emptyMap()) }
    val puzzle = remember(lang) { Polyword.puzzleFor(bank, lang, today) }
    var draft by remember(lang) { mutableStateOf("") }
    var toast by remember(lang) { mutableStateOf<String?>(null) }
    GameFrame(graph, WebGame.Polyword, back) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            bank.targets.filter { bank.langs[it]?.isNotEmpty() == true }.forEach { l ->
                PLPill("${Lang.flag(l)} ${Lang.name(l)}", active = l == lang, small = true) { lang = l; graph.kv.set("polyword.lang", l) }
            }
        }
        if (puzzle == null) { Text("No puzzle for this language today.", color = PL.InkDim); return@GameFrame }
        val key = "$lang:$today"
        val guesses = saved[key]?.guesses.orEmpty()
        val over = Polyword.finished(guesses, puzzle.answer)
        val won = Polyword.solved(guesses, puzzle.answer)
        fun save(next: List<String>) {
            saved = saved + (key to SavedGame(next, Polyword.finished(next, puzzle.answer), Polyword.solved(next, puzzle.answer)))
            graph.kv.set("polyword.games", PlayAssets.json.encodeToString(saver, saved))
        }
        Text("#$today  ${puzzle.answer.length} letters in ${Lang.name(lang)}. Six guesses.", style = Type.small, color = PL.InkDim)
        repeat(Polyword.MAX_GUESSES) { r ->
            val g = guesses.getOrNull(r)
            val marks = g?.let { Polyword.score(it, puzzle.answer) }
            val text = g ?: if (r == guesses.size && !over) draft else ""
            Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(puzzle.answer.length) { i ->
                    val m = marks?.get(i)
                    Box(
                        Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(PLRadius.sm)).background(markColor(m))
                            .border(2.dp, if (m == null) PL.Hairline2 else Color.Transparent, RoundedCornerShape(PLRadius.sm)),
                        contentAlignment = Alignment.Center,
                    ) { Text(text.getOrNull(i)?.uppercase() ?: "", style = Type.title, color = if (m == null) PL.Ink else PL.Paper) }
                }
            }
        }
        val hints = Polyword.revealedHints(puzzle.hints, puzzle.answer, guesses)
        if (hints.isNotEmpty()) {
            SectionTitle("Meaning in other languages")
            hints.forEach { h -> WordTile(h.lang, h.word, ipa = h.roman, tilt = 0f) }
        }
        toast?.let { Text(it, color = PL.Vermilion) }
        if (!over) {
            val keys = Polyword.keyMarks(guesses, puzzle.answer)
            listOf("qwertyuiop", "asdfghjkl", "zxcvbnm").forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally)) {
                    row.forEach { c ->
                        val m = keys[c]
                        Box(
                            Modifier.weight(1f).heightIn(min = 46.dp).clip(RoundedCornerShape(8.dp)).background(if (m == null) PL.Paper2 else markColor(m))
                                .clickable(role = Role.Button) { if (draft.length < puzzle.answer.length) draft += c; toast = null },
                            contentAlignment = Alignment.Center,
                        ) { Text(c.uppercase(), color = if (m == null) PL.Ink else PL.Paper, fontSize = 16.sp, style = Type.small) }
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PLButton("Delete", Modifier.weight(1f), variant = ButtonVariant.Secondary, size = ButtonSize.Md) { draft = draft.dropLast(1) }
                PLButton("Enter", Modifier.weight(1f), size = ButtonSize.Md) {
                    when (val c = Polyword.checkGuess(draft, puzzle.answer, guesses)) {
                        is GuessCheck.Ok -> { save(guesses + c.guess); draft = "" }
                        is GuessCheck.Bad -> toast = when (c.reason) { "short" -> "Use ${puzzle.answer.length} letters."; "repeat" -> "You tried that word."; else -> "Letters a to z only." }
                    }
                }
            }
        } else {
            val stats = Polyword.stats(saved.filterKeys { it.startsWith("$lang:") }.mapKeys { it.key.substringAfter(':').toInt() }.mapValues { PolyGame(it.value.guesses, it.value.done, it.value.won) }, today)
            Results(graph, if (won) "Solved in ${guesses.size}" else "The word was ${puzzle.word}", "Streak ${stats.streak}. Best ${stats.best}. New word tomorrow.", again = null) {
                val word = remember(puzzle.slug) { PlayAssets.words(context).firstOrNull { it.slug == puzzle.slug } }
                if (RevealRules.polyword(guesses, puzzle.answer)) { if (word != null) RevealWord(graph, word, lang) else WordTile(lang, puzzle.word, gloss = puzzle.gloss) }
                PLButton("Share", variant = ButtonVariant.Accent) {
                    val text = Polyword.shareText(lang, today, puzzle.answer, puzzle.hints, guesses, "https://www.polingual.com/play/polyword") { Lang.flag(it) }
                    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), null))
                }
            }
        }
    }
}
