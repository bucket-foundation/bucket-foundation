package com.polingual.app.play

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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polingual.app.Graph
import com.polingual.app.Type
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.EmptyState
import foundation.bucket.core.ui.pl.FlagSwatch
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLPill
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle

private enum class BabelPhase { Loading, Play, Won, Lost }

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BabelScreen(graph: Graph, back: () -> Unit) {
    val sets = remember { LangSets.all.filter { it.targets.size >= 3 }.map { it.copy(targets = it.targets.take(3)) } }
    var set by remember { mutableStateOf(sets[0]) }
    var lvl by remember { mutableIntStateOf(graph.kv.get("babel.level")?.toIntOrNull()?.takeIf { it > 0 } ?: 1) }
    var meanings by remember { mutableStateOf<List<Meaning>>(emptyList()) }
    var deal by remember { mutableStateOf<Dealer?>(null) }
    var board by remember { mutableStateOf<List<Cell>>(emptyList()) }
    var picked by remember { mutableStateOf<Int?>(null) }
    var moves by remember { mutableIntStateOf(0) }
    var cleared by remember { mutableStateOf<List<Cell>>(emptyList()) }
    var score by remember { mutableIntStateOf(0) }
    var phase by remember { mutableStateOf(BabelPhase.Loading) }
    var attempt by remember { mutableIntStateOf(0) }
    val goal = Babel.level(lvl)
    LaunchedEffect(lvl, set, attempt) {
        phase = BabelPhase.Loading
        val m = Babel.meanings(graph.corpus.load().items, set.targets, lvl)
        val rng = XorRng(lvl * 7919 + set.id.length)
        val d = Dealer(m, set.targets, rng::next, 0)
        meanings = m; deal = d; board = Babel.playable(d); moves = goal.moves; cleared = emptyList(); score = 0; picked = null
        phase = if (m.size < Babel.MEANINGS) BabelPhase.Loading else BabelPhase.Play
    }
    val byId = meanings.associateBy { it.id }
    fun tap(i: Int) {
        val d = deal ?: return
        if (phase != BabelPhase.Play) return
        val p = picked
        when {
            p == null -> picked = i
            p == i -> picked = null
            !Babel.adjacent(p, i) -> picked = i
            else -> {
                val trial = Babel.swapped(board, p, i)
                picked = null
                if (Babel.matches(trial).isEmpty()) return
                val out = Babel.resolve(trial, d)
                val next = cleared + out.cleared
                board = Babel.playable(d, out.board)
                cleared = next
                score += Babel.points(out.cleared.size, out.cascades)
                moves -= 1
                if (next.size >= goal.goal) { phase = BabelPhase.Won; graph.kv.set("babel.level", (lvl + 1).toString()) } else if (moves <= 0) phase = BabelPhase.Lost
            }
        }
    }
    GameFrame(graph, WebGame.Babel, back) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            sets.forEach { s -> PLPill(s.targets.joinToString(" ") { Lang.flag(it) }, active = s == set, small = true) { set = s } }
        }
        if (phase == BabelPhase.Loading) { EmptyState("blocks", "Dealing level $lvl."); return@GameFrame }
        if (phase == BabelPhase.Play) {
            Text("LEVEL $lvl", style = Type.caps, color = PL.InkDim)
            Text("Swap two neighbours. Three words that mean the same thing in a line clear, in any language.", style = Type.small, color = PL.Ink)
            Row {
                Text("$moves moves", style = Type.small, color = PL.InkDim, modifier = Modifier.weight(1f))
                Text("${minOf(cleared.size, goal.goal)} / ${goal.goal}", style = Type.title, color = PL.Vermilion, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
                Text("$score pts", style = Type.small, color = PL.InkDim, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                board.chunked(Babel.SIZE).forEachIndexed { r, row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        row.forEachIndexed { c, cell ->
                            val i = r * Babel.SIZE + c
                            val sel = picked == i
                            Column(
                                Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(10.dp)).background(if (sel) PL.Lapis else PL.White)
                                    .border(2.dp, if (sel) PL.LapisDeep else PL.Hairline2, RoundedCornerShape(10.dp)).clickable(role = Role.Button) { tap(i) },
                            ) {
                                FlagSwatch(cell.lang, Modifier.fillMaxWidth().height(6.dp))
                                Box(Modifier.fillMaxWidth().weight(1f).padding(2.dp), contentAlignment = Alignment.Center) {
                                    FitLabel(byId[cell.meaning]?.forms?.get(cell.lang).orEmpty(), Type.small, if (sel) PL.Paper else PL.Ink)
                                }
                            }
                        }
                    }
                }
            }
            return@GameFrame
        }
        Results(graph, if (phase == BabelPhase.Won) "Level $lvl cleared" else "Out of moves", "$score points, ${cleared.size} words cleared.", again = if (phase == BabelPhase.Won) ({ lvl += 1 }) else ({ attempt += 1 }), againLabel = if (phase == BabelPhase.Won) "Next level" else "Try again") {
            SectionTitle("Words you matched")
            if (RevealRules.babel(cleared.size, goal.goal, moves)) cleared.map { it.meaning }.distinct().mapNotNull { byId[it] }.forEach { m ->
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(PL.Paper2).padding(12.dp)) {
                    Text(m.meaning, style = Type.title, color = PL.Ink)
                    m.forms.forEach { (l, f) -> Text("${Lang.name(l)}: $f", style = Type.small, color = PL.InkDim) }
                }
            }
        }
    }
}
