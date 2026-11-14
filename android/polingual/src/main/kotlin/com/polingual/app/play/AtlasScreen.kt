package com.polingual.app.play

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.polingual.app.Graph
import com.polingual.app.Type
import com.polingual.app.today
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.EmptyState
import foundation.bucket.core.ui.pl.Glyph
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import foundation.bucket.core.ui.pl.WordTile

private data class AtlasGuess(val round: AtlasRound, val pin: LatLon, val home: LatLon, val km: Double, val points: Int)

@Composable
fun AtlasScreen(graph: Graph, back: () -> Unit) {
    val date = remember { com.polingual.app.deckDay() }
    val deckRoot = PlayDecks.root(graph.state.value?.system?.root)
    val land = remember { PathParser().parsePathString(graph.context.assets.open("play/land.txt").bufferedReader().use { it.readText().trim() }).toPath() }
    var rounds by remember { mutableStateOf<List<AtlasRound>?>(null) }
    var index by remember { mutableIntStateOf(0) }
    var pin by remember { mutableStateOf<LatLon?>(null) }
    var peek by remember { mutableStateOf(false) }
    var guesses by remember { mutableStateOf<List<AtlasGuess>>(emptyList()) }
    LaunchedEffect(Unit) { rounds = Atlas.rounds(graph.corpus.load().items, date, root = deckRoot) }
    val rs = rounds
    GameFrame(graph, WebGame.Atlas, back, soundOnly = true) {
        val silentNow by graph.silent.collectAsState()
        if (com.polingual.app.SoundRules.needsSoundCard(silentNow, true)) { com.polingual.app.NeedsSound(graph, "Voice Atlas"); return@GameFrame }
        if (rs == null) { EmptyState("azulejo", "Loading today's voices."); return@GameFrame }
        val limit = minOf(Atlas.ROUNDS, rs.size)
        val total = guesses.sumOf { it.points }
        if (index >= limit) {
            Results(graph, "$total points", "Five voices a day. New ones tomorrow.", again = null) {
                guesses.firstOrNull()?.let { g ->
                    PlayReveal(graph, g.round.lang, g.round.form, g.round.meaning, deckRoot, g.round.itemId)
                }
                guesses.drop(1).forEach { g -> WordLine(g.round.lang, g.round.form, "${Lang.name(g.round.lang)} · ${g.round.meaning} · +${g.points}") }
                SectionTitle("Today's board")
                Leaderboard(Boards.fromGhosts(Atlas.ghosts(date), total))
            }
            return@GameFrame
        }
        val round = rs[index]
        val guessed = guesses.firstOrNull { it.round == round }
        LaunchedEffect(round) { graph.voice.speak(round.form, round.lang, auto = true) }
        Row { Text("Round ${index + 1} of $limit", style = Type.small, color = PL.InkDim, modifier = Modifier.weight(1f)); Text("$total", style = Type.title, color = PL.Vermilion) }
        PLButton("Listen", variant = ButtonVariant.Accent, leading = { Glyph("speaker", null, PL.Paper, Modifier.size(20.dp)) }) { graph.voice.speak(round.form, round.lang) }
        if (peek || guessed != null) WordTile(null, round.form, tilt = 0f) else PLButton("Show the word, half points", variant = ButtonVariant.Quiet, block = false) { peek = true }
        Text("Where is this language spoken? Tap the map, then lock in.", style = Type.small, color = PL.InkDim)
        SceneFrame(Scenes.atlas, inset = 40.dp) { Canvas(
            Modifier.fillMaxWidth().aspectRatio(2f).clip(RoundedCornerShape(12.dp)).pointerInput(guessed) {
                detectTapGestures { o -> if (guessed == null) pin = Atlas.unproject(o.x / size.width * Atlas.MAP_W, o.y / size.height * Atlas.MAP_H) }
            },
        ) {
            drawRect(PL.LapisSoft)
            val k = size.width / Atlas.MAP_W.toFloat()
            scale(k, k, pivot = Offset.Zero) { drawPath(land, PL.Paper3) }
            fun pt(p: LatLon) = Atlas.project(p.lon, p.lat).let { Offset(it.first.toFloat() * k, it.second.toFloat() * k) }
            pin?.let { drawCircle(PL.Vermilion, 6.dp.toPx(), pt(it)) }
            if (guessed != null) {
                drawLine(PL.Ink, pt(guessed.pin), pt(guessed.home), 2.dp.toPx())
                drawCircle(PL.Malachite, 7.dp.toPx(), pt(guessed.home))
            }
        } }
        if (guessed == null) {
            PrimaryButton("Lock in", enabled = pin != null) {
                val p = pin ?: return@PrimaryButton
                val near = Atlas.nearestHome(round.lang, p) ?: return@PrimaryButton
                guesses = guesses + AtlasGuess(round, p, near.home, near.km, Math.round(Atlas.points(near.km) / if (peek) 2.0 else 1.0).toInt())
            }
        } else {
            Text("+${guessed.points} · ${"%,d".format(Math.round(guessed.km))} km away", style = Type.title, color = if (guessed.points >= Atlas.MAX / 2) PL.Malachite else PL.Vermilion)
            if (RevealRules.atlas(guessed != null)) { com.polingual.app.WordReveal(round.lang, round.form, round.meaning, round.itemId, null, rootLang = deckRoot) { graph.voice.speak(round.form, round.lang) } }
            PrimaryButton(if (guesses.size >= limit) "See results" else "Next round") { pin = null; peek = false; index += 1 }
        }
    }
}
