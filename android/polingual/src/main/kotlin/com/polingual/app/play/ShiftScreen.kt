package com.polingual.app.play

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.polingual.app.Graph
import com.polingual.app.Type
import com.polingual.app.today
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.EmptyState
import foundation.bucket.core.ui.pl.FlagSwatch
import foundation.bucket.core.ui.pl.Glyph
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PLRadius
import foundation.bucket.core.ui.pl.SectionTitle

@Composable
fun ShiftScreen(graph: Graph, back: () -> Unit) {
    val date = remember { today() }
    var board by remember { mutableStateOf<ShiftBoard?>(null) }
    var loaded by remember { mutableStateOf(false) }
    var offsets by remember { mutableStateOf<List<Int>>(emptyList()) }
    var found by remember { mutableStateOf<List<String>>(emptyList()) }
    var hints by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    LaunchedEffect(Unit) { board = Shift.board(graph.corpus.load().items, date); offsets = board?.columns?.map { 0 }.orEmpty(); loaded = true }
    val b = board
    val word = if (b != null && offsets.isNotEmpty()) Shift.centerWord(b.columns, offsets) else ""
    LaunchedEffect(word) { if (b != null && b.valid[word] != null && word !in found) found = found + word }
    GameFrame(graph, WebGame.Shift, back) {
        if (b == null) { EmptyState("torn-label", if (loaded) "No board today." else "Loading today's board."); return@GameFrame }
        val left = b.targets.filter { it.form !in found }
        if (left.isEmpty()) {
            Results(graph, "Board cleared", "${found.size} words found. A new board comes tomorrow.", again = null) {
                b.targets.forEach { t ->
                    val w = remember(t) { PlayAssets.words(graph.context).firstOrNull { it.form(t.lang)?.word?.lowercase() == t.form } }
                    if (w != null) RevealWord(graph, w, t.lang) else com.polingual.app.WordReveal(t.lang, t.form, t.meaning, null, null) { graph.voice.speak(t.form, t.lang) }
                }
            }
            return@GameFrame
        }
        Text("DAILY BOARD · $date", style = Type.caps, color = PL.InkDim)
        Text("Slide the columns to spell words in the middle row. Words count in ${b.langs.joinToString(" or ") { Lang.name(it) }}.", style = Type.small, color = PL.Ink)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) {
            b.columns.forEachIndexed { i, col ->
                fun at(d: Int) = col[(((offsets[i] + d) % col.size) + col.size) % col.size]
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(Modifier.size(56.dp, 44.dp).clickable(role = Role.Button, onClickLabel = "Column ${i + 1} up") { offsets = Shift.rotate(offsets, i, -1) }, contentAlignment = Alignment.Center) { Glyph("back", null, PL.Lapis, Modifier.size(22.dp).rotate(90f)) }
                    Text(at(-1).uppercase(), style = Type.title, color = PL.InkFaint)
                    Box(Modifier.size(64.dp).clip(RoundedCornerShape(PLRadius.md)).background(if (b.valid[word] != null) PL.Malachite else PL.Ink), contentAlignment = Alignment.Center) {
                        Text(at(0).uppercase(), style = Type.display, color = PL.Paper)
                    }
                    Text(at(1).uppercase(), style = Type.title, color = PL.InkFaint)
                    Box(Modifier.size(56.dp, 44.dp).clickable(role = Role.Button, onClickLabel = "Column ${i + 1} down") { offsets = Shift.rotate(offsets, i, 1) }, contentAlignment = Alignment.Center) { Glyph("back", null, PL.Lapis, Modifier.size(22.dp).rotate(-90f)) }
                }
            }
        }
        Text(b.valid[word]?.let { "$word · ${it.joinToString(", ") { l -> Lang.name(l) }}" } ?: "Keep sliding", style = Type.body, color = if (b.valid[word] != null) PL.Malachite else PL.InkDim)
        SectionTitle("Clues")
        b.targets.forEach { t ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FlagSwatch(t.lang, Modifier.size(22.dp, 16.dp).clip(RoundedCornerShape(3.dp)))
                Text(t.meaning, style = Type.body, color = PL.Ink, modifier = Modifier.weight(1f))
                Text(if (t.form in found) t.form else Shift.hintFor(t.form, hints[t.form] ?: 0), style = Type.caps, color = if (t.form in found) PL.Malachite else PL.InkDim)
            }
        }
        val extras = found.filter { f -> b.targets.none { it.form == f } }
        if (extras.isNotEmpty()) Text("Bonus words: ${extras.joinToString(", ")}", style = Type.small, color = PL.InkDim)
        PLButton("Reveal a letter", variant = ButtonVariant.Secondary) {
            left.firstOrNull { (hints[it.form] ?: 0) < Shift.letters(it.form).size }?.let { t -> hints = hints + (t.form to ((hints[t.form] ?: 0) + 1)) }
        }
        Box(Modifier.height(1.dp).padding(0.dp))
    }
}
