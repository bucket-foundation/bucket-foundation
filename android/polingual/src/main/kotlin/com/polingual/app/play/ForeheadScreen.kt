package com.polingual.app.play

import foundation.bucket.core.ui.pl.plSurface
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.polingual.app.Graph
import com.polingual.app.Type
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.EmptyState
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PLPill
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import kotlinx.coroutines.delay

private enum class FhPhase { Setup, Count, Play, Done }
private data class FhResult(val card: ForeheadCard, val got: Boolean)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ForeheadScreen(graph: Graph, back: () -> Unit) {
    var langs by remember { mutableStateOf(LangSets.all[0].targets) }
    var phase by remember { mutableStateOf(FhPhase.Setup) }
    var cards by remember { mutableStateOf<List<ForeheadCard>>(emptyList()) }
    var index by remember { mutableIntStateOf(0) }
    var results by remember { mutableStateOf<List<FhResult>>(emptyList()) }
    var left by remember { mutableIntStateOf(ForeheadDeck.SECONDS) }
    var count by remember { mutableIntStateOf(3) }
    var round by androidx.compose.runtime.saveable.rememberSaveable { mutableIntStateOf(0) }
    var dealSeed by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf("") }
    fun mark(got: Boolean) {
        val c = cards.getOrNull(index) ?: return
        if (phase != FhPhase.Play) return
        results = results + FhResult(c, got)
        index += 1
        if (index >= cards.size) phase = FhPhase.Done
    }
    LaunchedEffect(round) {
        if (round == 0) return@LaunchedEffect
        val items = graph.corpus.load().items
        cards = com.polingual.app.offMain { ForeheadDeck.deck(items, langs, dealSeed.ifEmpty { DealSeeds.fresh() }) }
        index = 0; results = emptyList(); left = ForeheadDeck.SECONDS; count = 3; phase = FhPhase.Count
        while (count > 0) { delay(1000); count -= 1 }
        phase = FhPhase.Play
        val end = System.currentTimeMillis() + ForeheadDeck.SECONDS * 1000L
        while (phase == FhPhase.Play) { left = maxOf(0, ((end - System.currentTimeMillis() + 999) / 1000).toInt()); if (left == 0) phase = FhPhase.Done; delay(200) }
    }
    val context = graph.context
    DisposableEffect(phase) {
        if (phase != FhPhase.Play) return@DisposableEffect onDispose { }
        val sm = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val sensor = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        var armed = false
        val listener = object : SensorEventListener {
            override fun onSensorChanged(e: SensorEvent) {
                val z = e.values[2].toDouble()
                if (!armed) { if (TiltRules.settled(z)) armed = true; return }
                TiltRules.classify(z)?.let { armed = false; mark(it == Tilt.Score) }
            }
            override fun onAccuracyChanged(s: Sensor?, a: Int) {}
        }
        if (sensor != null) sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_GAME)
        onDispose { sm.unregisterListener(listener) }
    }
    GameFrame(graph, WebGame.Forehead, back) {
        when (phase) {
            FhPhase.Setup -> GameSetup(
                "PARTY MODE · ONE PHONE", "Hold the phone to your forehead, screen out. Friends give clues in any language. Tilt down when you guess it, tilt up to pass. Sixty seconds a round.",
                Snakes.LANG_CHOICES, { it in langs }, { l -> langs = ForeheadRules.toggle(langs, l) }, "Start round", langs.isNotEmpty(),
            ) { dealSeed = DealSeeds.fresh(); round += 1 }
            FhPhase.Count -> Countdown(count)
            FhPhase.Play -> {
                val c = cards.getOrNull(index)
                if (c == null) { EmptyState("ticket", "Out of cards."); return@GameFrame }
                ForeheadCardView(c, left, results.count { it.got }, ::mark)
            }
            FhPhase.Done -> {
                val got = results.count { it.got }
                Results(graph, "$got guessed", "${results.size - got} passed. Tap a card to hear it.", again = { dealSeed = DealSeeds.fresh(); round += 1 }) {
                    ForeheadWords(graph, results.map { it.card to it.got }, RevealRules.forehead(cards.size - index, left))
                }
                PlainLink("Change languages") { phase = FhPhase.Setup }
            }
        }
    }
}

@Composable
private fun ForeheadCardView(c: ForeheadCard, left: Int, got: Int, mark: (Boolean) -> Unit) {
                Row { Text("$left", style = Type.display, color = PL.Ink, modifier = Modifier.weight(1f)); Text("$got", style = Type.display, color = PL.Malachite) }
                Column(Modifier.fillMaxWidth().plSurface(PL.Tyrian, 24.dp).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${Lang.flag(c.lang)} ${Lang.name(c.lang).uppercase()}", style = Type.caps, color = PL.Paper.copy(alpha = 0.8f))
                    Text(c.form, style = Type.word.copy(fontSize = 56.sp, lineHeight = 60.sp), color = PL.Paper, textAlign = TextAlign.Center)
                    (c.reading?.roman ?: c.reading?.kana)?.let { Text(it, style = Type.body, color = PL.Paper.copy(alpha = 0.8f)) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    PLButton("Pass", Modifier.weight(1f), variant = ButtonVariant.Secondary) { mark(false) }
                    PLButton("Got it", Modifier.weight(1f), variant = ButtonVariant.Success) { mark(true) }
                }
}

object ForeheadRules {
    fun toggle(langs: List<String>, l: String): List<String> = if (l in langs) langs - l else if (langs.size >= 6) langs else langs + l
}

@Composable
private fun Countdown(count: Int) {
    Box(Modifier.fillMaxWidth().height(320.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(if (count > 0) "$count" else "Go", style = Type.display.copy(fontSize = 120.sp, lineHeight = 120.sp), color = PL.Vermilion)
            Text("Put the phone on your forehead", style = Type.body, color = PL.InkDim)
        }
    }
}

@Composable
private fun ForeheadWords(graph: Graph, cards: List<Pair<ForeheadCard, Boolean>>, reveal: Boolean) {
    if (reveal) cards.firstOrNull()?.first?.let { c -> com.polingual.app.WordReveal(c.lang, c.form, c.meaning, c.itemId, null, ipa = c.reading?.ipa ?: c.reading?.roman, rootLang = PlayDecks.ROOT) { graph.voice.speak(c.form, c.lang) } }
    SectionTitle("Every card")
    cards.forEach { (c, got) -> WordLine(c.lang, c.form, (if (got) "✓ " else "") + c.meaning) }
}
