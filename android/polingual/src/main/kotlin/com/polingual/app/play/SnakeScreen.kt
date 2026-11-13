package com.polingual.app.play

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
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
import kotlin.math.atan2

private enum class SnakePhase { Setup, Play, Dead, Over }

private val SNAKE_COLORS = listOf(PL.VermilionDeep, PL.Lapis, PL.Ochre, PL.Tyrian, PL.Malachite)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SnakeScreen(graph: Graph, back: () -> Unit) {
    var lang by remember { mutableStateOf("es") }
    var phase by remember { mutableStateOf(SnakePhase.Setup) }
    var deck by remember { mutableStateOf<SnakeDeck?>(null) }
    var arena by remember { mutableStateOf<Arena?>(null) }
    var aim by remember { mutableStateOf<Double?>(null) }
    var left by remember { mutableIntStateOf((Snakes.ROUND_MS / 1000).toInt()) }
    var round by remember { mutableIntStateOf(0) }
    val measurer = rememberTextMeasurer()
    val scope = rememberCoroutineScope()
    LaunchedEffect(round) {
        if (round == 0) return@LaunchedEffect
        val others = Snakes.LANG_CHOICES.filter { it != lang }.take(5)
        val d = Snakes.deck(graph.corpus.load().items, lang, others, (1 + (Math.random() * 1e12).toLong()).toString())
        val rng = XorRng(System.currentTimeMillis().toInt())
        val rand = rng::next
        val bots = Bots.all.take(4).mapIndexed { i, b -> Snakes.make(b.userId, b.name, true, Snakes.SKILL[b.skill] ?: 0.8, Pt(200 + rand() * 1200, 150 + rand() * 700), rand() * 6.28, i + 1) }
        var a = Snakes.eat(Arena(listOf(Snakes.make("me", "You", false, 1.0, Pt(Snakes.WORLD_W / 2, Snakes.WORLD_H / 2), 0.0, 0)) + bots, emptyList(), 0, emptyList(), emptyList()), d, rand)
        deck = d; aim = null; arena = a; phase = SnakePhase.Play
        val end = System.currentTimeMillis() + Snakes.ROUND_MS
        var last = withFrameNanos { it }
        while (true) {
            val now = withFrameNanos { it }
            val dt = minOf(0.05, (now - last) / 1e9)
            last = now
            a = a.copy(snakes = a.snakes.map { s -> if (!s.alive) s else Snakes.advance(s, if (s.bot) Snakes.botTarget(s, a.words, rand) else aim ?: s.angle, dt) })
            a = Snakes.eat(a, d, rand)
            val c = Snakes.collide(a)
            a = c.arena.copy(snakes = c.arena.snakes.map { s -> if (s.bot && !s.alive) Snakes.make(s.id, s.name, true, s.skill, Pt(100 + rand() * 1400, 100 + rand() * 800), rand() * 6.28, s.color) else s })
            arena = a
            left = maxOf(0, ((end - System.currentTimeMillis() + 999) / 1000).toInt())
            val me = a.snakes.first { it.id == "me" }
            if (left <= 0) { phase = SnakePhase.Over; break }
            if (!me.alive) { phase = SnakePhase.Dead; break }
        }
    }
    GameFrame(graph, WebGame.Snake, back) {
        when (phase) {
            SnakePhase.Setup -> {
                Text("ARENA", style = Type.caps, color = PL.InkDim)
                Text("Steer with your finger. Eat words in your language to grow. Words in other languages shrink you. Touch a bigger snake and you are out.", style = Type.body, color = PL.Ink)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Snakes.LANG_CHOICES.take(10).forEach { l -> PLPill("${Lang.flag(l)} ${Lang.name(l)}", active = l == lang, small = true) { lang = l } }
                }
                PrimaryButton("Play") { round += 1 }
            }
            SnakePhase.Play -> {
                val a = arena ?: run { EmptyState("brush", "Building the arena."); return@GameFrame }
                val me = a.snakes.first { it.id == "me" }
                Row {
                    Text("${me.length}", style = Type.display, color = PL.Vermilion, modifier = Modifier.weight(1f))
                    Text("Eat ${Lang.name(deck?.lang ?: "")}", style = Type.small, color = PL.InkDim, modifier = Modifier.weight(1f))
                    Text("${left}s", style = Type.small, color = PL.InkDim)
                }
                SceneFrame(Scenes.snake, inset = 36.dp) { Canvas(
                    Modifier.fillMaxWidth().aspectRatio(0.8f).clip(RoundedCornerShape(16.dp)).pointerInput(Unit) {
                        awaitEachGesture {
                            val down = awaitFirstDown()
                            fun point(p: Offset) {
                                val cur = arena?.snakes?.firstOrNull { it.id == "me" } ?: return
                                val w = minOf(Snakes.WORLD_W, size.width / density.toDouble() * 1.2)
                                val h = minOf(Snakes.WORLD_H, size.height / density.toDouble() * 1.2)
                                val vx = (cur.body[0].x - w / 2).coerceIn(0.0, Snakes.WORLD_W - w)
                                val vy = (cur.body[0].y - h / 2).coerceIn(0.0, Snakes.WORLD_H - h)
                                val wx = vx + p.x / size.width * w
                                val wy = vy + p.y / size.height * h
                                aim = atan2(wy - cur.body[0].y, wx - cur.body[0].x)
                            }
                            point(down.position)
                            while (true) {
                                val e = awaitPointerEvent()
                                val c = e.changes.firstOrNull() ?: break
                                if (!c.pressed) break
                                point(c.position)
                            }
                        }
                    },
                ) {
                    val w = minOf(Snakes.WORLD_W, size.width / density * 1.2)
                    val h = minOf(Snakes.WORLD_H, size.height / density * 1.2)
                    val vx = (me.body[0].x - w / 2).coerceIn(0.0, Snakes.WORLD_W - w)
                    val vy = (me.body[0].y - h / 2).coerceIn(0.0, Snakes.WORLD_H - h)
                    val k = (size.width / w).toFloat()
                    fun sx(x: Double) = ((x - vx) * k).toFloat()
                    fun sy(y: Double) = ((y - vy) * k).toFloat()
                    drawRect(PL.Tyrian)
                    var gx = -(vx % 80)
                    while (gx < w) { drawLine(PL.Paper.copy(alpha = 0.07f), Offset((gx * k).toFloat(), 0f), Offset((gx * k).toFloat(), size.height), 1.5f); gx += 80 }
                    var gy = -(vy % 80)
                    while (gy < h) { drawLine(PL.Paper.copy(alpha = 0.07f), Offset(0f, (gy * k).toFloat()), Offset(size.width, (gy * k).toFloat()), 1.5f); gy += 80 }
                    val kente = listOf(PL.Ochre, PL.Malachite, PL.Ochre, PL.Vermilion, PL.Ink)
                    listOf(260.0, 740.0).forEach { band ->
                        var x = 0.0
                        var i = 0
                        while (x < Snakes.WORLD_W) {
                            val c = kente[i % kente.size]
                            val bw = if (c == PL.Ochre) 26.0 else 8.0
                            drawRect(c.copy(alpha = 0.55f), Offset(sx(x), sy(band)), androidx.compose.ui.geometry.Size((bw * k).toFloat(), (44 * k).toFloat()))
                            x += bw; i++
                        }
                    }
                    a.words.forEach { fw ->
                        val x = sx(fw.x); val y = sy(fw.y)
                        if (x < -200 || y < -60 || x > size.width + 200 || y > size.height + 60) return@forEach
                        val r = measurer.measure(fw.form, TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Bold, color = PL.Ink), softWrap = false, maxLines = 1)
                        val tw = r.size.width + 24f
                        drawRoundRect(PL.White, Offset(x - tw / 2, y - 18.dp.toPx() / 1f), Size(tw, 36.dp.toPx() / 1f), CornerRadius(12f))
                        drawRoundRect(PL.Hairline2, Offset(x - tw / 2, y - 18.dp.toPx()), Size(tw, 36.dp.toPx()), CornerRadius(12f), style = Stroke(2f))
                        drawText(r, topLeft = Offset(x - r.size.width / 2f, y - r.size.height / 2f))
                    }
                    a.snakes.filter { it.alive }.forEach { s ->
                        val path = Path().apply { s.body.forEachIndexed { i, p -> if (i == 0) moveTo(sx(p.x), sy(p.y)) else lineTo(sx(p.x), sy(p.y)) } }
                        drawPath(path, SNAKE_COLORS[s.color % SNAKE_COLORS.size], style = Stroke(14f * k, cap = StrokeCap.Round, join = StrokeJoin.Round))
                        drawCircle(PL.White, 4f * k, Offset(sx(s.body[0].x), sy(s.body[0].y)))
                        val label = measurer.measure("${s.name} ${s.length}", TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PL.Paper), softWrap = false, maxLines = 1)
                        drawText(label, topLeft = Offset(sx(s.body[0].x) - label.size.width / 2f, sy(s.body[0].y) - 18 * k - label.size.height))
                    }
                } }
            }
            SnakePhase.Dead, SnakePhase.Over -> {
                val a = arena
                val me = a?.snakes?.firstOrNull { it.id == "me" }
                Results(graph, "Length ${me?.length ?: 0}", if (phase == SnakePhase.Dead) "Swallowed by a bigger snake." else "Time is up.", again = { round += 1 }) {
                    val eaten = a?.eaten.orEmpty().distinctBy { "${it.lang}:${it.form}" }
                    SectionTitle("Words you ate")
                    if (eaten.isEmpty()) Text("None this round.", style = Type.small, color = PL.InkDim)
                    eaten.firstOrNull()?.let { fw ->
                        val word = remember(fw) { PlayAssets.words(graph.context).firstOrNull { it.form(fw.lang)?.word == fw.form } }
                        if (RevealRules.snake(me?.alive ?: false, left)) { if (word != null) RevealWord(graph, word, fw.lang) else com.polingual.app.WordReveal(fw.lang, fw.form, fw.meaning, null, null) { graph.voice.speak(fw.form, fw.lang) } }
                    }
                    eaten.drop(1).forEach { fw -> WordLine(fw.lang, fw.form, fw.meaning) }
                    val bad = a?.bad.orEmpty().distinctBy { "${it.lang}:${it.form}" }
                    if (bad.isNotEmpty()) {
                        SectionTitle("Decoys")
                        bad.forEach { fw -> WordLine(fw.lang, fw.form, "${Lang.name(fw.lang)} · ${fw.meaning}") }
                    }
                }
                foundation.bucket.core.ui.pl.PlainLink("Change language") { phase = SnakePhase.Setup }
            }
        }
    }
}

@Composable
fun WordLine(lang: String, form: String, meaning: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FlagSwatch(lang, Modifier.size(22.dp, 16.dp).clip(RoundedCornerShape(3.dp)))
        Text(form, style = Type.body.copy(fontWeight = FontWeight.Bold), color = PL.Ink)
        Text(meaning, style = Type.small, color = PL.InkDim)
    }
}
