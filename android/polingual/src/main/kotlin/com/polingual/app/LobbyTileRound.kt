package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.Lobby
import foundation.bucket.core.model.LobbyPrompt
import foundation.bucket.core.model.LobbyTiles
import foundation.bucket.core.ui.pl.FlagSwatch
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.WordTile
import kotlinx.coroutines.launch

@Composable
fun TileRound(graph: Graph, lobby: Lobby, prompt: LobbyPrompt, index: Int, remaining: Double, reveal: Boolean) {
    val state by graph.lobbies.state.collectAsState()
    val scope = rememberCoroutineScope()
    val schedule = remember(prompt) { LobbyTiles.schedule(prompt.choices.size, index, lobby.rounds, lobby.roundSeconds) }
    var tapped by remember(index) { mutableStateOf(emptySet<Int>()) }
    val tickElapsed = ((lobby.roundSeconds - remaining) * 1000).toLong()
    val startedAt = lobby.startedAt?.let { foundation.bucket.core.model.parseInstantMs(it) }
    val roundStart = startedAt?.let { LobbyTiles.roundStartMs(index, it, lobby.roundSeconds, lobby.revealSeconds) }
    var frameElapsed by remember(index) { mutableStateOf(tickElapsed) }
    LaunchedEffect(index, roundStart, reveal) {
        if (roundStart == null || reveal) return@LaunchedEffect
        while (true) {
            androidx.compose.runtime.withFrameMillis { }
            frameElapsed = System.currentTimeMillis() + state.offsetMs - roundStart
            if (frameElapsed > lobby.roundSeconds * 1000L) break
        }
    }
    val elapsed = if (roundStart != null && !reveal) frameElapsed else tickElapsed
    val submitted = state.picks[index] != null
    LaunchedEffect(elapsed >= LobbyTiles.submitAtMs(lobby.roundSeconds), reveal) {
        if (!submitted && !reveal && elapsed >= LobbyTiles.submitAtMs(lobby.roundSeconds)) graph.lobbies.pick(LobbyTiles.tappedChoice(tapped), index)
    }
    Text("Tap every word that means", style = Type.small, color = PL.InkDim)
    WordTile(lobby.root, prompt.gloss, tilt = 0f)
    val right = prompt.answer?.split(',')?.filter { it.isNotEmpty() }?.map { it.toInt() }?.toSet().orEmpty()
    BoxWithConstraints(Modifier.fillMaxWidth().height(340.dp).clip(RoundedCornerShape(16.dp)).background(PL.Tyrian)) {
        val laneW = maxWidth / LobbyTiles.LANES
        LobbyTiles.visible(schedule, prompt.choices.size, elapsed, tapped, reveal).forEach { (slot, p) ->
            val t = LobbyTiles.parse(prompt.choices[slot.index])
            val y = if (reveal) (slot.index / LobbyTiles.LANES) * 70f else p * 280f
            val tone = when {
                reveal && slot.index in right -> PL.Malachite
                reveal && slot.index in tapped -> PL.Vermilion
                else -> PL.Card
            }
            Box(Modifier.offset(laneW * slot.lane, y.dp).width(laneW).padding(3.dp).clip(RoundedCornerShape(10.dp)).background(tone)) {
                FlagSwatch(t.lang, Modifier.fillMaxWidth().height(5.dp))
                com.polingual.app.play.FitLabel(t.form, Type.small, if (tone == PL.Card) PL.Ink else PL.Paper, Modifier.padding(top = 8.dp, bottom = 6.dp, start = 3.dp, end = 3.dp).fillMaxWidth())
            }
        }
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(LobbyTiles.LANES) { lane ->
            Box(
                Modifier.weight(1f).height(56.dp).clip(RoundedCornerShape(12.dp)).background(PL.Lapis)
                    .clickable(enabled = !reveal && !submitted, role = Role.Button, onClickLabel = "Lane ${lane + 1}") {
                        LobbyTiles.laneTarget(prompt.choices, schedule, lane, elapsed, tapped)?.let { tapped = tapped + it }
                    },
                contentAlignment = Alignment.Center,
            ) { Text("Lane ${lane + 1}", style = Type.small, color = PL.Paper) }
        }
    }
    if (reveal && prompt.answer != null) {
        val o = LobbyTiles.outcome(prompt.answer!!, tapped.toList())
        Text(if (o.perfect) "Perfect" else "${o.hits} right, ${o.wrong} wrong, ${o.missed} missed", style = Type.title, color = if (o.perfect) PL.Malachite else PL.Vermilion)
        prompt.choices.mapIndexedNotNull { i, c -> if (i in right) LobbyTiles.parse(c) else null }.forEach { t ->
            Text("${Lang.name(t.lang)}: ${t.form}", style = Type.small, color = PL.Ink)
        }
    }
}
