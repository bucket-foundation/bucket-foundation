package com.polingual.app

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import foundation.bucket.core.model.AtlasClip
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.FamilyNight
import foundation.bucket.core.model.FamilyRules
import foundation.bucket.core.model.ForeheadCard
import foundation.bucket.core.model.Interlude
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.LeagueBoard
import foundation.bucket.core.model.Lobby
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyPhase
import foundation.bucket.core.model.PlayerCard
import foundation.bucket.core.model.SeatBand
import foundation.bucket.core.model.TeachView
import foundation.bucket.core.model.TriviaQuestion
import foundation.bucket.core.model.TriviaView
import foundation.bucket.core.ui.pl.ButtonSize
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PLPill
import foundation.bucket.core.ui.pl.PLToggle
import foundation.bucket.core.ui.pl.Pill
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

object FamilyCopy {
    fun waitingOn(lobby: Lobby): String {
        val names = lobby.waitingOn.map { it.name }
        return when {
            lobby.players.count { it.online || it.bot } < 2 -> "Two players start the game."
            names.isEmpty() -> "Everyone is ready."
            names.size == 1 -> "Waiting for ${names[0]} to get ready."
            else -> "Waiting for ${names.size} players to get ready."
        }
    }

    fun nextGame(seconds: Int?, host: Boolean): String = when {
        seconds == null -> if (host) "Start the next game when the room is set." else "The host starts the next game."
        seconds > 0 -> "Next game in $seconds s"
        else -> "Next game starting"
    }

    fun leftRoom(result: foundation.bucket.core.model.LeaveResult?): String? = when (result) {
        foundation.bucket.core.model.LeaveResult.Handoff -> "You left. Another player hosts the room now."
        foundation.bucket.core.model.LeaveResult.Closed -> "You left and the room closed."
        else -> null
    }

    fun setupLabel(setup: String, night: Boolean): String = when {
        night -> "Family night"
        setup == "mix" -> "Mix"
        setup == "sequence" -> "Playlist"
        else -> "One game"
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PlayerCardPanel(graph: Graph, lobby: Lobby) {
    val state by graph.lobbies.state.collectAsState()
    val scope = rememberCoroutineScope()
    var card by remember(lobby.id) { mutableStateOf(state.card) }
    var saved by remember(lobby.id) { mutableStateOf(state.card != null) }
    var error by remember { mutableStateOf<String?>(null) }
    val langs = (listOf(lobby.root) + lobby.targets + Lang.codes).distinct()
    Card(Modifier.testTag("player-card")) {
        Text("Your player card", style = Type.title, color = PL.Ink)
        Text("Age", style = Type.caps, color = PL.InkDim)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SeatBand.entries.forEach { b -> PLPill(b.label, active = card?.band == b) { card = (card ?: PlayerCard(b)).copy(band = b); saved = false } }
        }
        val c = card
        if (c?.band == SeatBand.Under13) Text("Kids play with an age band only. Nothing else leaves this phone.", color = PL.InkDim)
        if (c != null && c.band != SeatBand.Under13) {
            Text("Languages you speak", style = Type.caps, color = PL.InkDim)
            langs.take(12).forEach { l ->
                val level = c.speaks.firstOrNull { it.lang == l }?.level ?: 0
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("${Lang.flag(l)} ${Lang.name(l)}", color = PL.Ink, modifier = Modifier.weight(1f))
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    PLPill("None", active = level == 0, small = true) { card = c.withSpoken(l, 0); saved = false }
                    PlayerCard.levels.forEach { (n, label) -> PLPill(label, active = level == n, small = true) { card = c.withSpoken(l, n); saved = false } }
                }
            }
            Text("Want to learn, up to ${PlayerCard.MAX_LEARN}", style = Type.caps, color = PL.InkDim)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                langs.filter { l -> c.speaks.none { it.lang == l } }.take(16).forEach { l -> PLPill("${Lang.flag(l)} ${Lang.name(l)}", active = l in c.learn, small = true) { card = c.toggleLearn(l); saved = false } }
            }
        }
        if (saved) Text("Saved for this room.", color = PL.Malachite)
        PrimaryButton(if (saved) "Update card" else "Save card", enabled = c?.complete == true && !state.busy, color = PL.Malachite) {
            val pick = c ?: return@PrimaryButton
            scope.launch {
                error = null
                try { graph.lobbies.saveCard(pick); saved = true } catch (e: BucketError) { error = LobbyErrors.text(e) }
            }
        }
        error?.let { Text(it, color = PL.Vermilion) }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HostControls(graph: Graph, lobby: Lobby, nickname: String, act: (suspend () -> Unit) -> Unit) {
    Card(Modifier.testTag("host-controls")) {
        Text("Host", style = Type.caps, color = PL.InkDim)
        PrimaryButton("Start game", enabled = lobby.canStart) { act { graph.lobbies.start() } }
        Text(FamilyCopy.waitingOn(lobby), color = PL.InkDim)
        if (!lobby.game.isRace) {
            Text("Setup: ${FamilyCopy.setupLabel(lobby.setup, lobby.night != null)}", color = PL.Ink)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                PLPill("One game", active = lobby.setup == "single", small = true) { act { graph.lobbies.settings(game = lobby.game, setup = "single") } }
                PLPill("Family night", active = lobby.night != null, small = true) { act { graph.lobbies.settings(setup = "sequence", games = FamilyNight.games.map { it.first }) } }
                PLPill("Mix", active = lobby.setup == "mix", small = true) { act { graph.lobbies.settings(setup = "mix") } }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Host on this screen, no seat", color = PL.Ink, modifier = Modifier.weight(1f))
            PLToggle(!lobby.seated, { screen -> act { graph.lobbies.hostMode(screen, if (screen) null else nickname.ifEmpty { "Host" }) } }, "Host on this screen")
        }
        if (lobby.guestsWatch != null) Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Guests can watch", color = PL.Ink, modifier = Modifier.weight(1f))
            PLToggle(lobby.guestsWatch == true, { on -> act { graph.lobbies.settings(guestsWatch = on) } }, "Guests can watch")
        }
        if (lobby.botsEnabled && !lobby.botFill && !lobby.game.isRace) PlainLink("Fill empty seats with bots") { act { graph.lobbies.fillBots() } }
        if (lobby.canEnd) PlainLink("Close lobby") { act { graph.lobbies.close() } }
    }
}

@Composable
fun NextGamePanel(graph: Graph, lobby: Lobby, now: Long, leave: () -> Unit, act: (suspend () -> Unit) -> Unit) {
    if (lobby.ended) {
        Text("The host closed this room.", color = PL.InkDim)
        PrimaryButton("Leave", color = PL.Lapis, onClick = leave)
        return
    }
    val seconds = lobby.nextGameSeconds(now)
    Card(Modifier.testTag("next-game")) {
        Text(FamilyCopy.nextGame(seconds, lobby.isHost), style = Type.title, color = PL.Ink)
        lobby.night?.let { n -> if (!n.final) Text("Family night, round ${n.index + 2} of ${n.total} is next.", color = PL.InkDim) }
        if (lobby.isHost) PrimaryButton("Next game", color = PL.Malachite) { act { graph.lobbies.nextGame() } }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PlainLink("Leave") { leave() }
            if (lobby.isHost && lobby.canEnd) PlainLink("Close lobby") { act { graph.lobbies.close() } }
        }
    }
}

@Composable
fun InterludePanel(graph: Graph, lobby: Lobby, slot: Interlude, now: Long) {
    when (slot) {
        is Interlude.VoiceAtlas -> AtlasInterlude(graph, lobby, slot, now)
        is Interlude.Forehead -> ForeheadInterlude(graph, lobby, slot, now)
        Interlude.FamilyTeach -> TeachInterlude(graph, lobby)
        Interlude.OurTrivia -> TriviaInterlude(graph, lobby)
    }
}

private fun secondsLeft(endsAt: Long, now: Long) = maxOf(0L, (endsAt - now + 999) / 1000)

@Composable
private fun AtlasInterlude(graph: Graph, lobby: Lobby, slot: Interlude.VoiceAtlas, now: Long) {
    var clips by remember(lobby.startedAt) { mutableStateOf<List<AtlasClip>>(emptyList()) }
    LaunchedEffect(lobby.startedAt, slot.clip) { runCatching { graph.lobbies.room { t, id -> atlas(t, id) } }.onSuccess { clips = it } }
    val clip = clips.getOrNull(slot.clip)
    val last = clips.getOrNull(slot.clip - 1)
    Card(Modifier.testTag("atlas-round")) {
        Text("Voice Atlas, clip ${slot.clip + 1} of ${FamilyNight.ATLAS_CLIPS} · ${secondsLeft(slot.endsAtMs, now)} s", style = Type.caps, color = PL.InkDim)
        Text("Where is this language spoken?", style = Type.title, color = PL.Ink)
        last?.lang?.let { Text("Last clip was ${Lang.name(it)}.", color = PL.InkDim) }
        val lang = clip?.lang
        if (clip != null && lang != null) PLButton("Play the voice", variant = ButtonVariant.Ghost, size = ButtonSize.Md) { graph.voice.speak(clip.form, lang) }
        else Text("Listen to the TV and talk it over.", color = PL.Ink)
    }
}

@Composable
private fun ForeheadInterlude(graph: Graph, lobby: Lobby, slot: Interlude.Forehead, now: Long) {
    val scope = rememberCoroutineScope()
    var cards by remember(lobby.startedAt) { mutableStateOf<List<ForeheadCard>>(emptyList()) }
    var marked by remember { mutableStateOf<Map<Int, String>>(emptyMap()) }
    LaunchedEffect(lobby.startedAt) { runCatching { graph.api.forehead(lobby.targets, FamilyRules.foreheadSeed(lobby.seed, lobby.startedAt), lobby.root) }.onSuccess { cards = it } }
    val card = cards.takeIf { it.isNotEmpty() }?.let { it[slot.card % it.size] }
    val holderId = FamilyNight.foreheadHolder(lobby.players, slot.card)
    val holder = lobby.players.firstOrNull { it.userId == holderId }
    val holding = lobby.me?.userId != null && lobby.me?.userId == holderId
    Card(Modifier.testTag("forehead-round")) {
        Text("Forehead · card ${slot.card + 1} · ${secondsLeft(slot.endsAtMs, now)} s", style = Type.caps, color = PL.InkDim)
        if (holding && card != null) {
            Text(card.form, style = Type.display, color = PL.Ink)
            Text("Hold your phone on your forehead. The room gives you clues.", color = PL.InkDim)
        } else Text(holder?.let { "${it.name} holds the phone up. Give clues in any language." } ?: "Waiting for players", style = Type.title, color = PL.Ink)
        if (lobby.isHost && !holding) {
            val done = marked.containsKey(slot.card)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(true to "Got it", false to "Skip").forEach { (got, label) ->
                    PLButton(label, Modifier.weight(1f), variant = if (got) ButtonVariant.Success else ButtonVariant.Ghost, size = ButtonSize.Md, enabled = !done) {
                        scope.launch {
                            val ok = runCatching { graph.lobbies.room { t, id -> foreheadMark(t, id, slot.card, got) } }.isSuccess
                            marked = marked + (slot.card to if (!ok) "Too late for that card." else if (got) "${holder?.name ?: "They"} got it. +100" else "Skipped")
                        }
                    }
                }
            }
        }
        marked[slot.card]?.let { Text(it, color = PL.InkDim) }
    }
}

@Composable
fun AudienceView(graph: Graph, lobby: Lobby, phase: LobbyPhase) {
    val state by graph.lobbies.state.collectAsState()
    val scope = rememberCoroutineScope()
    Card(Modifier.testTag("audience-view")) {
        Pill("Watching", PL.Lapis)
        Text("You watch from the audience. Players score the points.", color = PL.InkDim)
    }
    val round = (phase as? LobbyPhase.Round)?.index ?: (phase as? LobbyPhase.Reveal)?.index
    val prompt = round?.let(lobby::prompt)
    if (round != null && prompt != null) {
        Text("Round ${round + 1} of ${lobby.rounds}", style = Type.subhead, color = PL.Ink)
        Text(prompt.gloss, style = Type.word, color = PL.Ink)
        if (FamilyNight.bonusRound(lobby, round)) {
            SectionTitle("Bonus vote")
            Text("Which answer will the players pick? One vote each.", color = PL.InkDim)
            val mine = state.votes[round]
            val tally = lobby.bonus(round)
            prompt.choices.forEach { c ->
                val share = tally?.share(c)?.let { " · ${(it * 100).toInt()}%" }.orEmpty()
                PLButton(c + share, variant = if (mine == c) ButtonVariant.Accent else ButtonVariant.Secondary, size = ButtonSize.Md, enabled = mine == null) { scope.launch { graph.lobbies.vote(round, c) } }
            }
            if (mine != null) Text("Vote in. Watch the TV for the answer.", color = PL.Malachite)
        }
    }
    SectionTitle("Scores")
    lobby.standings.forEachIndexed { i, pl ->
        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
            Text("${i + 1}", fontWeight = FontWeight.Bold, color = PL.Ink, modifier = Modifier.padding(end = 12.dp))
            Text(pl.name, color = PL.Ink, modifier = Modifier.weight(1f))
            Text("${pl.score}", fontWeight = FontWeight.Bold, color = PL.Ink)
        }
    }
}

@Composable
fun LeagueCard(graph: Graph) {
    var board by remember { mutableStateOf<LeagueBoard?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { try { board = graph.lobbies.league() } catch (e: BucketError) { error = if (e == BucketError.Revoked) "Sign in to join the weekly league." else LobbyErrors.text(e) } }
    Card(Modifier.testTag("league")) {
        Text("Weekly league", style = Type.title, color = PL.Ink)
        val b = board
        when {
            b != null -> {
                Text("${b.tierName} tier, this week", color = PL.InkDim)
                b.board.take(10).forEach { r ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                        Text("${r.rank}", fontWeight = FontWeight.Bold, color = PL.Ink, modifier = Modifier.padding(end = 12.dp))
                        Text(r.name, color = PL.Ink, fontWeight = if (r.me) FontWeight.ExtraBold else FontWeight.Normal, modifier = Modifier.weight(1f))
                        Text("${r.points}", color = PL.Ink)
                    }
                }
            }
            error != null -> Text(error.orEmpty(), color = PL.InkDim)
            else -> Text("Loading the board", color = PL.InkDim)
        }
    }
}
