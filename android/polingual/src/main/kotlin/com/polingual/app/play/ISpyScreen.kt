package com.polingual.app.play

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
    var seed by remember { mutableStateOf("1") }
    var now by remember { mutableLongStateOf(0L) }
    var loading by remember { mutableStateOf(false) }
    fun settle(index: Int) {
        val turns = ISpy.botTurns(seed, index, ISpy.ROUND_SECONDS)
        bots = turns.associate { t -> t.botId to ISpy.award(bots[t.botId] ?: Tally(), t.correct, t.atMs, ISpy.ROUND_SECONDS).first }
    }
    LaunchedEffect(loading) {
        if (!loading) return@LaunchedEffect
        seed = System.currentTimeMillis().toString()
        rounds = ISpy.rounds(graph.corpus.load().items, seed, "en", set.targets, ISpy.ROUNDS)
        me = Tally(); bots = emptyMap(); loading = false
        phase = SpyPhase.Round(0, System.currentTimeMillis())
    }
    LaunchedEffect(phase) {
        val p = phase
        if (p !is SpyPhase.Round) return@LaunchedEffect
        graph.voice.speak(rounds[p.index].gloss, rounds[p.index].lang)
        while (true) {
            now = System.currentTimeMillis()
            if (now - p.startedAt >= ISpy.ROUND_SECONDS * 1000L) { settle(p.index); phase = SpyPhase.Reveal(p.index, false, null); break }
            delay(100)
        }
    }
    GameFrame(graph, WebGame.ISpy, back) {
        when (val p = phase) {
            SpyPhase.Setup -> {
                Text("A word appears in another language. Find it in the picture before the bots do.", style = Type.body, color = PL.Ink)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    ISpy.SETS.forEach { s -> PLPill(s.label, active = s == set, small = true) { set = s } }
                }
                PrimaryButton(if (loading) "Setting the scene" else "Play solo", enabled = !loading) { loading = true }
            }
            is SpyPhase.Round, is SpyPhase.Reveal -> {
                val index = if (p is SpyPhase.Round) p.index else (p as SpyPhase.Reveal).index
                val r = rounds[index]
                val scene = ISpy.scene(r.scene)!!
                Text("${scene.name} · round ${index + 1} of ${rounds.size}", style = Type.small, color = PL.InkDim)
                WordTile(r.lang, r.gloss, tilt = 0f, onSpeak = { graph.voice.speak(r.gloss, r.lang) })
                if (p is SpyPhase.Round) LinearProgressIndicator(progress = { (1f - (now - p.startedAt) / (ISpy.ROUND_SECONDS * 1000f)).coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth(), color = PL.Vermilion, trackColor = PL.Paper3)
                val marks = if (p is SpyPhase.Reveal) buildMap { put(r.answer, PL.Malachite); if (p.tapped != null && !p.correct) put(p.tapped, PL.Vermilion) } else emptyMap()
                BoxWithConstraints(Modifier.fillMaxWidth().aspectRatio(0.75f).clip(RoundedCornerShape(20.dp)).background(PL.Tyrian).drawBehind {
                    drawPath(Path().apply { moveTo(0f, 0f); lineTo(size.width * 0.38f, 0f); lineTo(size.width * 0.22f, size.height); lineTo(0f, size.height); close() }, PL.TyrianDeep)
                }) {
                    scene.decor.forEach { d -> Art(d.art, Modifier.width(maxWidth * (d.size / 100).toFloat()).offset(maxWidth * (d.x / 100).toFloat(), maxHeight * (d.y / 100).toFloat()).rotate(d.tilt.toFloat())) }
                    val tile = maxWidth * 0.15f
                    scene.objects.forEach { o ->
                        val mark = marks[o.id]
                        Box(
                            Modifier.offset(maxWidth * (o.x / 100).toFloat() - tile / 2, maxHeight * (o.y / 100).toFloat() - tile / 2).size(tile).rotate(o.tilt.toFloat())
                                .then(if (mark != null) Modifier.border(4.dp, mark, RoundedCornerShape(8.dp)) else Modifier)
                                .clickable(enabled = p is SpyPhase.Round, role = Role.Button, onClickLabel = "Picture") {
                                    val ps = phase as? SpyPhase.Round ?: return@clickable
                                    val correct = o.id == r.answer
                                    me = ISpy.award(me, correct, System.currentTimeMillis() - ps.startedAt, ISpy.ROUND_SECONDS).first
                                    settle(ps.index)
                                    phase = SpyPhase.Reveal(ps.index, correct, o.id)
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Art(TILE_ART[o.art % TILE_ART.size], Modifier.size(tile))
                            Art("obj-${o.id}", Modifier.size(tile * 0.78f))
                        }
                    }
                }
                Board(me, bots)
                if (p is SpyPhase.Reveal) {
                    Text(if (p.correct) "Spotted" else "Here it was", style = Type.title, color = if (p.correct) PL.Malachite else PL.Vermilion)
                    val w = remember(r) { PlayAssets.words(graph.context).firstOrNull { it.slug == r.answer || it.form(r.lang)?.word == r.gloss } }
                    if (w != null) RevealWord(graph, w, r.lang) else com.polingual.app.WordReveal(r.lang, r.gloss, r.answer, r.itemId, null) { graph.voice.speak(r.gloss, r.lang) }
                    PrimaryButton(if (index + 1 >= rounds.size) "See results" else "Next") { phase = if (index + 1 >= rounds.size) SpyPhase.Done else SpyPhase.Round(index + 1, System.currentTimeMillis()) }
                }
            }
            SpyPhase.Done -> {
                val rank = (bots.values.map { it.score } + me.score).sortedDescending().indexOf(me.score) + 1
                Results(graph, if (rank == 1) "You spied them all first" else "You finished #$rank", "${me.score} points across ${rounds.size} rounds.", again = { loading = true }) {
                    Board(me, bots)
                }
            }
        }
    }
}

@Composable
private fun Board(me: Tally, bots: Map<String, Tally>) {
    SectionTitle("Board")
    val rows = (ISpy.BOTS.map { "${Bots.countryFlag(it.flag)} ${it.name}" to (bots[it.id]?.score ?: 0) } + ("You" to me.score)).sortedByDescending { it.second }
    rows.forEach { (n, s) -> Row { Text(n, style = Type.body, color = if (n == "You") PL.Vermilion else PL.Ink, modifier = Modifier.weight(1f)); Text("$s", style = Type.body, color = PL.Ink) } }
}
