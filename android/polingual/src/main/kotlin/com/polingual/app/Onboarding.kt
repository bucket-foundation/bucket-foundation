package com.polingual.app

import foundation.bucket.core.ui.pl.*
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.FlagTile
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import kotlinx.coroutines.launch
import java.util.Locale

object Interface {
    val deviceRoot: String get() = Locale.getDefault().language.takeIf { it in Lang.info } ?: "en"
}

@Composable
fun Onboarding(graph: Graph) {
    var step by remember { mutableStateOf(0) }
    val root = remember { Interface.deviceRoot }
    var targets by remember { mutableStateOf(listOf("fr", "es", "it", "de").filter { it != root }.take(3)) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val p = LocalPalette.current
    GroundBox(Ground.Diagonal, Modifier.fillMaxSize()) { Column(Modifier.fillMaxSize()) { Box(Modifier.weight(1f).fillMaxWidth().safeDrawingPadding(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxSize().padding(PLSpace.s4)) {
            AnimatedContent(step, modifier = Modifier.weight(1f), label = "step") { s ->
                Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    if (s == 0) Welcome() else Languages(root, targets) { targets = it }
                }
            }
            Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.Center) {
                repeat(2) { i ->
                    Box(Modifier.padding(4.dp).size(if (i == step) 22.dp else 8.dp, 8.dp).clip(RoundedCornerShape(50)).background(if (i == step) PL.Vermilion else p.rule))
                }
            }
            PrimaryButton(
                text = if (step == 0) "Get started" else if (busy) "Setting up" else "Continue",
                enabled = !(step == 1 && targets.isEmpty()) && !busy,
            ) {
                if (step == 0) step = 1 else scope.launch {
                    busy = true
                    graph.createSystem(root, targets)
                    graph.store.update { it.copy(onboarded = true) }
                    busy = false
                }
            }
            if (step == 1) PlainLink("Skip for now", Modifier.align(Alignment.CenterHorizontally), onDark = true) { scope.launch { graph.store.update { it.copy(onboarded = true) } } }
        }
    }
    FlagBand() } }
}

@Composable
private fun Welcome() {
    val p = LocalPalette.current
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Art("seal", Modifier.size(44.dp), description = "Polingual")
        Text("polingual", style = Type.title, color = p.ink)
    }
    Text(
        buildAnnotatedString {
            append("Language learning for ")
            withStyle(SpanStyle(color = PL.Vermilion)) { append("multilingual") }
            append(" learners.")
        },
        style = Type.display, color = p.ink,
    )
    Stage(
        listOf(
            Sticker("ticket", Alignment.TopStart, 170.dp, -8f),
            Sticker("seal", Alignment.TopEnd, 92.dp, 10f, dy = 8.dp),
            Sticker("torn-label", Alignment.BottomStart, 140.dp, 6f, dx = 12.dp),
            Sticker("kente", Alignment.BottomEnd, 120.dp, -5f, dy = (-8).dp),
            Sticker("pebble", Alignment.Center, 54.dp, -12f, dx = 30.dp),
        ),
        height = 230.dp,
    )
    PLCard { StreakFlame(100) }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Languages(root: String, targets: List<String>, onChange: (List<String>) -> Unit) {
    val p = LocalPalette.current
    Text("Which languages?", style = Type.display, color = p.ink)
    Text("Each word comes back in every language you pick.", color = p.muted)
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(PLRadius.lg)).background(PL.Card).border(2.dp, PL.Hairline, RoundedCornerShape(PLRadius.lg)).padding(PLSpace.s3), horizontalArrangement = Arrangement.spacedBy(PLSpace.s3)) {
        if (targets.isEmpty()) Text("Pick at least one.", color = p.muted, modifier = Modifier.height(76.dp))
        targets.forEach { l ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                FlagTile(l)
                Text(Lang.name(l), style = Type.caps, color = p.ink)
            }
        }
    }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Lang.presets.forEach { preset ->
            val set = preset.targets.filter { it != root }
            PLPill("${preset.name} ${preset.targets.joinToString("") { Lang.flag(it) }}", active = set.toSet() == targets.toSet()) { onChange(set) }
        }
    }
    Spacer(Modifier.height(4.dp))
    Text("Or pick your own, up to ${Lang.MAX_TARGETS}", style = Type.caps, color = p.muted)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Lang.codes.filter { it != root && it in setOf("es", "fr", "it", "pt", "de", "nl", "sv", "ru", "ja", "ar", "el", "fi", "hi", "ko", "pl") }.forEach { l ->
            val on = l in targets
            PLPill("${Lang.flag(l)} ${Lang.name(l)}", active = on) { onChange(if (on) targets - l else if (targets.size < Lang.MAX_TARGETS) targets + l else targets) }
        }
    }
}
