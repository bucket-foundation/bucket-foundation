package com.polingual.app

import foundation.bucket.core.ui.pl.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.Lobby
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyPhase
import foundation.bucket.core.model.LobbyPromptMode
import foundation.bucket.core.model.LobbyRules
import foundation.bucket.core.model.LobbyStatus
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.ChoiceButton
import foundation.bucket.core.ui.pl.ChoiceState
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.Pill
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
internal fun RaceRoom(graph: Graph, lobby: Lobby, remaining: Double, score: Int?, leave: () -> Unit) {
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    androidx.compose.runtime.DisposableEffect(lobby.id) {
        RaceSession.open(lobby) { s -> scope.launch { graph.lobbies.postScore(s) } }
        onDispose { RaceSession.close(lobby.id) }
    }
    Column(Modifier.fillMaxSize().background(p.paper)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(lobby.game.title, style = Type.subhead, color = p.ink, modifier = Modifier.weight(1f))
                Text(RaceClock.text(remaining), style = Type.subhead, color = if (remaining < 30) PL.Vermilion else p.ink, modifier = Modifier.testTag("lobbyRaceClock"))
            }
            Row {
                Text("${lobby.raceFinishers.size} of ${lobby.players.size} finished", style = Type.small, color = p.muted, modifier = Modifier.weight(1f))
                Text(score?.let { "Your score: $it" } ?: "Highest score wins", style = Type.small, color = p.muted)
            }
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when (lobby.game) {
                LobbyGame.FlagTiles -> com.polingual.app.play.FlagTilesScreen(graph, leave)
                LobbyGame.Shift -> com.polingual.app.play.ShiftScreen(graph, leave)
                LobbyGame.Atlas -> com.polingual.app.play.AtlasScreen(graph, leave)
                else -> Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${lobby.game.title} races play on the web and iPhone.", color = p.ink)
                    PlainLink("Leave room") { leave() }
                }
            }
        }
    }
}

object RaceClock {
    fun text(remaining: Double): String {
        val s = kotlin.math.ceil(maxOf(0.0, remaining)).toInt()
        return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
    }
}

object LobbySpy {
    fun scene(choices: List<String>): com.polingual.app.play.SpyScene? =
        com.polingual.app.play.ISpy.SCENES.firstOrNull { sc -> sc.objects.map { it.id }.toSet() == choices.toSet() }

    fun marks(prompt: foundation.bucket.core.model.LobbyPrompt, picked: String?, mark: Boolean?): Map<String, androidx.compose.ui.graphics.Color> = buildMap {
        if (picked != null) put(picked, if (mark == false) PL.Vermilion else PL.Malachite)
        prompt.answer?.let { put(it, PL.Malachite) }
    }
}

@Composable
internal fun SpyRound(graph: Graph, prompt: foundation.bucket.core.model.LobbyPrompt, index: Int, reveal: Boolean) {
    val p = LocalPalette.current
    val state by graph.lobbies.state.collectAsState()
    val scope = rememberCoroutineScope()
    val picked = state.picks[index]
    val mark = state.marks[index]
    Text(prompt.lang?.let { "Find this in the picture, ${Lang.name(it)}" } ?: "Find this in the picture", color = p.muted)
    WordCard(prompt.lang, prompt.gloss, tilt = 0f)
    val scene = LobbySpy.scene(prompt.choices)
    if (scene == null) { Text("This round's picture is not on this version of the app.", color = p.muted); return }
    com.polingual.app.play.SpyStage(scene, LobbySpy.marks(prompt, picked, mark), enabled = !reveal && picked == null) { id ->
        scope.launch { graph.lobbies.pick(id, index) }
    }
    when {
        picked != null && mark == null -> Text("Checking", color = p.muted)
        mark == true -> Text("Right", color = PL.Malachite, fontWeight = FontWeight.Bold)
        mark == false -> Text("Not this time.", color = PL.Vermilion, fontWeight = FontWeight.Bold)
    }
}
