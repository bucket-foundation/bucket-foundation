package com.polingual.app.play

import foundation.bucket.core.ui.pl.plSurface
import com.polingual.app.WordCard
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.polingual.app.Graph
import com.polingual.app.Type
import foundation.bucket.core.ui.pl.Art
import foundation.bucket.core.ui.pl.EmptyState
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLPill
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import foundation.bucket.core.ui.pl.WordTile
import kotlinx.coroutines.delay

private sealed interface SpyPhase {
    data object Setup : SpyPhase
    data class Round(val index: Int, val startedAt: Long) : SpyPhase
    data class Reveal(val index: Int, val correct: Boolean, val tapped: String?) : SpyPhase
    data object Done : SpyPhase
}

private val TILE_ART = listOf("torn-label", "ticket", "seal", "sk-kente", "sk-azulejo", "sk-paisley", "sk-mudcloth")

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ISpyScreen(graph: Graph, back: () -> Unit) {
    var set by remember { mutableStateOf(ISpy.SETS[0]) }
    var rounds by remember { mutableStateOf<List<SpyRound>>(emptyList()) }
    var phase by remember { mutableStateOf<SpyPhase>(SpyPhase.Setup) }
    var me by remember { mutableStateOf(Tally()) }
    var bots by remember { mutableStateOf<Map<String, Tally>>(emptyMap()) }
    var seed by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf("1") }
    var now by remember { mutableLongStateOf(0L) }
    var loading by remember { mutableStateOf(false) }
    fun settle(index: Int) {
        val turns = ISpy.botTurns(seed, index, ISpy.ROUND_SECONDS)
        bots = turns.associate { t -> t.botId to ISpy.award(bots[t.botId] ?: Tally(), t.correct, t.atMs, ISpy.ROUND_SECONDS).first }
    }
    LaunchedEffect(loading) {
        if (!loading) return@LaunchedEffect
        val items = graph.corpus.load().items
        rounds = com.polingual.app.offMain { ISpy.rounds(items, seed, "en", set.targets, ISpy.ROUNDS) }
        me = Tally(); bots = emptyMap(); loading = false
        phase = SpyPhase.Round(0, System.currentTimeMillis())
    }
    LaunchedEffect(phase) {
        val p = phase
        if (p !is SpyPhase.Round) return@LaunchedEffect
        graph.voice.speak(rounds[p.index].gloss, rounds[p.index].lang, auto = true)
        while (true) {
            now = System.currentTimeMillis()
            if (now - p.startedAt >= ISpy.ROUND_SECONDS * 1000L) { settle(p.index); phase = SpyPhase.Reveal(p.index, false, null); break }
            delay(100)
        }
    }
    GameFrame(graph, WebGame.ISpy, back) {
        when (val p = phase) {
            SpyPhase.Setup -> SpySetup(set, loading, { set = it }) { seed = DealSeeds.fresh(); loading = true }
            is SpyPhase.Round, is SpyPhase.Reveal -> {
                val index = if (p is SpyPhase.Round) p.index else (p as SpyPhase.Reveal).index
                val r = rounds[index]
                val scene = ISpy.scene(r.scene)!!
                SpyHud(graph, "${scene.name} · round ${index + 1} of ${rounds.size}", r, if (p is SpyPhase.Round) (1f - (now - p.startedAt) / (ISpy.ROUND_SECONDS * 1000f)).coerceIn(0f, 1f) else null)
                val marks = if (p is SpyPhase.Reveal) buildMap { put(r.answer, PL.Malachite); if (p.tapped != null && !p.correct) put(p.tapped, PL.Vermilion) } else emptyMap()
                SpyStage(scene, marks, p is SpyPhase.Round) { id ->
                    val ps = phase as? SpyPhase.Round ?: return@SpyStage
                    val correct = id == r.answer
                    me = ISpy.award(me, correct, System.currentTimeMillis() - ps.startedAt, ISpy.ROUND_SECONDS).first
                    settle(ps.index)
                    phase = SpyPhase.Reveal(ps.index, correct, id)
                }
                Board(me, bots)
                if (p is SpyPhase.Reveal && RevealRules.iSpy(tapped = p.tapped != null, elapsedMs = if (p.tapped == null) ISpy.ROUND_SECONDS * 1000L else 0L)) {
                    SpyReveal(graph, r, p.correct, last = index + 1 >= rounds.size) { phase = if (index + 1 >= rounds.size) SpyPhase.Done else SpyPhase.Round(index + 1, System.currentTimeMillis()) }
                }
            }
            SpyPhase.Done -> {
                val rank = (bots.values.map { it.score } + me.score).sortedDescending().indexOf(me.score) + 1
                Results(graph, if (rank == 1) "You spied them all first" else "You finished #$rank", "${me.score} points across ${rounds.size} rounds.", again = { seed = DealSeeds.fresh(); loading = true }) {
                    Board(me, bots)
                }
            }
        }
    }
}

@Composable
private fun Board(me: Tally, bots: Map<String, Tally>) {
    SectionTitle("Board")
    Leaderboard(Boards.withYou(ISpy.BOTS.map { Boards.named(it.flag, it.name, bots[it.id]?.score ?: 0) }, me.score), numbered = false)
}

@Composable
private fun SpyStage(scene: SpyScene, marks: Map<String, androidx.compose.ui.graphics.Color>, enabled: Boolean, onTap: (String) -> Unit) {
                BoxWithConstraints(Modifier.fillMaxWidth().aspectRatio(0.75f).plSurface(PL.Tyrian, 20.dp).drawBehind {
                    drawPath(Path().apply { moveTo(0f, 0f); lineTo(size.width * 0.38f, 0f); lineTo(size.width * 0.22f, size.height); lineTo(0f, size.height); close() }, PL.TyrianDeep)
                }) {
                    scene.decor.forEach { d -> Art(d.art, Modifier.width(maxWidth * (d.size / 100).toFloat()).offset(maxWidth * (d.x / 100).toFloat(), maxHeight * (d.y / 100).toFloat()).rotate(d.tilt.toFloat())) }
                    val tile = maxWidth * 0.15f
                    scene.objects.forEach { o ->
                        val mark = marks[o.id]
                        Box(
                            Modifier.offset(maxWidth * (o.x / 100).toFloat() - tile / 2, maxHeight * (o.y / 100).toFloat() - tile / 2).size(tile).rotate(o.tilt.toFloat())
                                .then(if (mark != null) Modifier.border(4.dp, mark, RoundedCornerShape(8.dp)) else Modifier)
                                .clickable(enabled = enabled, role = Role.Button, onClickLabel = "Picture") { onTap(o.id) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Art(TILE_ART[o.art % TILE_ART.size], Modifier.size(tile))
                            Art("obj-${o.id}", Modifier.size(tile * 0.78f))
                        }
                    }
                }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SpySetup(set: LangSet, loading: Boolean, onSet: (LangSet) -> Unit, onPlay: () -> Unit) {
    Text("A word appears in another language. Find it in the picture before the bots do.", style = Type.body, color = PL.Ink)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        ISpy.SETS.forEach { s -> PLPill(s.label, active = s == set, small = true) { onSet(s) } }
    }
    PrimaryButton(if (loading) "Setting the scene" else "Play solo", enabled = !loading, onClick = onPlay)
}

@Composable
private fun SpyReveal(graph: Graph, r: SpyRound, correct: Boolean, last: Boolean, onNext: () -> Unit) {
    Text(if (correct) "Spotted" else "Here it was", style = Type.title, color = if (correct) PL.Malachite else PL.Vermilion)
    PlayReveal(graph, r.lang, r.gloss, r.answer, PlayDecks.ROOT, r.itemId, slug = r.answer)
    PrimaryButton(if (last) "See results" else "Next", onClick = onNext)
}

@Composable
private fun SpyHud(graph: Graph, line: String, r: SpyRound, progress: Float?) {
    Text(line, style = Type.small, color = PL.InkDim)
    WordCard(r.lang, r.gloss, tilt = 0f, onSpeak = { graph.voice.speak(r.gloss, r.lang) })
    if (progress != null) LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth(), color = PL.Vermilion, trackColor = PL.Paper3)
}
