package com.polingual.app.play

import com.polingual.app.WordCard
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.unit.dp
import com.polingual.app.Graph
import com.polingual.app.Type
import com.polingual.app.today
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.EmptyState
import foundation.bucket.core.ui.pl.FlagTile
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLRadius
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import foundation.bucket.core.ui.pl.WordTile

@Composable
fun FlagTilesScreen(graph: Graph, back: () -> Unit) {
    val date = remember { com.polingual.app.deckDay() }
    val deckRoot = PlayDecks.root(graph.state.value?.system?.root)
    var deck by remember { mutableStateOf<FlagTilesDeck?>(null) }
    var run by remember { mutableStateOf(RunState()) }
    var progress by remember { mutableFloatStateOf(0f) }
    var best by remember { mutableStateOf(graph.kv.get("flagtiles.best.$date")?.toIntOrNull() ?: 0) }
    LaunchedEffect(Unit) { val items = graph.corpus.load().items; deck = com.polingual.app.offMain { FlagTilesRules.deck(items, date, root = deckRoot) } }
    val d = deck
    val tile = if (d != null && run.phase != RunPhase.Ready && d.tiles.isNotEmpty()) d.tiles[(run.missed ?: run.index) % d.tiles.size] else null
    val answer = if (tile != null && d != null) d.langs.indexOf(tile.lang) else -1
    LaunchedEffect(run.phase, run.index) {
        if (run.phase != RunPhase.Running) return@LaunchedEffect
        val ms = FlagTilesRules.fallMs(run.index)
        val start = withFrameNanos { it }
        progress = 0f
        while (true) {
            val now = withFrameNanos { it }
            progress = ((now - start) / 1_000_000f / ms).coerceAtMost(1f)
            if (progress >= 1f) { run = FlagTilesRules.step(run, RunEvent.Timeout); break }
        }
    }
    LaunchedEffect(run.phase) {
        if (run.phase == RunPhase.Over) { best = maxOf(best, run.score); graph.kv.set("flagtiles.best.$date", best.toString()) }
    }
    GameFrame(graph, WebGame.FlagTiles, back) {
        if (d == null) { EmptyState("kente", "Loading today's tiles."); return@GameFrame }
        if (d.langs.size < 4 || d.tiles.size < 40) { EmptyState("pebble", "Flag Tiles needs more words in the bundled corpus."); return@GameFrame }
        @Composable
        fun Lanes() {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                d.langs.forEachIndexed { i, l ->
                    val state = when {
                        run.phase == RunPhase.Missed || run.phase == RunPhase.Over -> if (i == answer) PL.Malachite else if (i == run.picked) PL.Vermilion else null
                        else -> null
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        FlagTile(l, 64.dp, selected = state == PL.Vermilion) { if (run.phase == RunPhase.Running && answer >= 0) run = FlagTilesRules.step(run, RunEvent.Tap(i, answer)) }
                        Text(Lang.name(l), style = Type.small, color = state ?: PL.Ink)
                    }
                }
            }
        }
        when (run.phase) {
            RunPhase.Ready -> {
                Text("DAILY RUN · $date", style = Type.caps, color = PL.InkDim)
                Text("A word falls. Tap the flag of its language before it lands. Speed rises every ten words, and one miss ends the run.", style = Type.body, color = PL.Ink)
                Lanes()
                PrimaryButton("Start run") { run = FlagTilesRules.step(run, RunEvent.Start) }
                Text("Today's best: $best", style = Type.small, color = PL.InkDim)
            }
            RunPhase.Running -> {
                Row { Text("${run.score}", style = Type.display, color = PL.Vermilion, modifier = Modifier.weight(1f)); Text("Best $best", style = Type.small, color = PL.InkDim) }
                SceneFrame(Scenes.flagTiles) { BoxWithConstraints(Modifier.fillMaxWidth().height(300.dp).clip(RoundedCornerShape(PLRadius.md)).background(PL.Paper).drawBehind {
                    val stripes = listOf(PL.Ochre, PL.Malachite, PL.Vermilion, PL.Ink)
                    val lane = size.width / 4f
                    for (i in 1 until 4) stripes.forEachIndexed { k, c -> drawRect(c, androidx.compose.ui.geometry.Offset(lane * i - 6f + k * 3f, 0f), androidx.compose.ui.geometry.Size(3f, size.height)) }
                    drawRect(PL.Ochre.copy(alpha = 0.18f), size = androidx.compose.ui.geometry.Size(size.width, 10f))
                }) {
                    if (tile != null) Box(Modifier.align(Alignment.TopCenter).offset(y = (maxHeight - 120.dp) * progress).padding(horizontal = 24.dp)) { WordCard(null, tile.form, tilt = 0f) }
                    Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(6.dp).background(PL.Vermilion))
                } }
                Lanes()
            }
            RunPhase.Missed -> {
                Text("${run.score}", style = Type.display, color = PL.Vermilion)
                Text(if (run.picked == null) "Too slow" else "Wrong flag", style = Type.title, color = PL.Ink)
                val missed = d.tiles[(run.missed ?: 0) % d.tiles.size]
                if (RevealRules.flagTiles(run)) PlayReveal(graph, missed.lang, missed.form, missed.meaning, deckRoot, missed.itemId)
                run.picked?.let { Text("You picked ${Lang.name(d.langs[it])}.", style = Type.small, color = PL.InkDim) }
                PrimaryButton("See results") { run = FlagTilesRules.step(run, RunEvent.End) }
            }
            RunPhase.Over -> Results(graph, "${run.score} words", "Today's best: $best. New deck tomorrow.", again = { run = FlagTilesRules.step(run, RunEvent.Start) }) {
                SectionTitle("Today's board")
                Leaderboard(Boards.fromGhosts(FlagTilesRules.ghosts(date), run.score))
            }
        }
    }
}
