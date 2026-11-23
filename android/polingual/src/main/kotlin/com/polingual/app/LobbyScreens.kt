package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import com.polingual.brand.Card
import com.polingual.brand.ChoiceButton
import foundation.bucket.core.ui.ChoiceState
import com.polingual.brand.D8
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.Pill
import com.polingual.brand.PlainLink
import com.polingual.brand.PrimaryButton
import com.polingual.brand.SectionTitle
import com.polingual.brand.Type
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

val nativeLobbyGames = listOf(LobbyGame.Daily, LobbyGame.SameWord, LobbyGame.Flags, LobbyGame.Live)

@Composable
fun LobbiesScreen(graph: Graph, code: String, back: () -> Unit) {
    val p = LocalPalette.current
    val state by graph.lobbies.state.collectAsState()
    val app by graph.state.collectAsState()
    val stage by graph.account.stage.collectAsState()
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    var joinCode by remember { mutableStateOf(code) }
    var nick by remember(app?.nickname) { mutableStateOf(app?.nickname.orEmpty()) }
    var game by remember { mutableStateOf(LobbyGame.Daily) }
    var bots by remember { mutableStateOf(false) }
    val signedIn = stage == Stage.SignedIn
    val name = nick.trim()
    fun act(block: suspend () -> Unit) = scope.launch {
        error = null
        if (!signedIn && name.isEmpty()) { error = graph.context.getString(R.string.s_pick_a_name_to_play_live); return@launch }
        if (name != app?.nickname) graph.store.update { it.copy(nickname = name) }
        try { block() } catch (e: BucketError) { error = e.message }
    }
    LaunchedEffect(Unit) { graph.lobbies.refresh() }
    LaunchedEffect(code) { if (code.isNotBlank() && (signedIn || name.isNotEmpty()) && state.current == null) act { graph.lobbies.join(code, name.ifEmpty { "Player" }) } }
    if (state.current != null) { RoomScreen(graph) { scope.launch { graph.lobbies.leave() } }; return }
    Page(androidx.compose.ui.res.stringResource(R.string.s_live_rooms), back = back) {
        com.polingual.brand.Hero {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) { com.polingual.brand.Pulse(); com.polingual.brand.Label(androidx.compose.ui.res.stringResource(R.string.d_live_now), color = D8.parchment) }
            com.polingual.brand.Heading(androidx.compose.ui.res.stringResource(R.string.d_play_same_round_live), color = D8.parchment, size = 28)
            Text(androidx.compose.ui.res.stringResource(R.string.s_play_the_same_round_with_friends), style = Type.body, color = D8.parchment.copy(alpha = 0.9f))
        }
        OutlinedTextField(nick, { nick = it.take(40) }, singleLine = true, label = { Text(if (signedIn) androidx.compose.ui.res.stringResource(R.string.s_display_name) else androidx.compose.ui.res.stringResource(R.string.s_your_name)) }, modifier = Modifier.fillMaxWidth())
        Card {
            Text(androidx.compose.ui.res.stringResource(R.string.s_join_with_a_code), style = Type.caps, color = p.muted)
            OutlinedTextField(joinCode, { joinCode = it.filter(Char::isLetterOrDigit).uppercase().take(LobbyRules.CODE_LENGTH) }, singleLine = true, label = { Text(androidx.compose.ui.res.stringResource(R.string.s_room_code)) },
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters), modifier = Modifier.fillMaxWidth())
            PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_join), enabled = joinCode.length == LobbyRules.CODE_LENGTH && !state.busy, color = D8.malachite) { act { graph.lobbies.join(joinCode, name.ifEmpty { "Player" }) } }
        }
        val system = app?.system
        Card {
            Text(androidx.compose.ui.res.stringResource(R.string.s_start_a_room), style = Type.caps, color = p.muted)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                nativeLobbyGames.forEach { g -> com.polingual.brand.Chip(g.title, g == game) { game = g } }
            }
            if (state.botsEnabled) Row(verticalAlignment = Alignment.CenterVertically) {
                Text(androidx.compose.ui.res.stringResource(R.string.s_fill_empty_seats_with_bots), color = p.ink, modifier = Modifier.weight(1f))
                Switch(bots, { bots = it })
            }
            if (system == null) Text(androidx.compose.ui.res.stringResource(R.string.s_start_a_language_set_in_learn_2), color = p.muted)
            PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_create_room), enabled = system != null && !state.busy) {
                val s = system ?: return@PrimaryButton
                act {
                    graph.lobbies.create("${name.ifEmpty { "Polingual" }}'s room", game, s.root, s.targets, name.ifEmpty { "Host" })
                    if (bots) graph.lobbies.fillBots()
                }
            }
        }
        error?.let { Text(it, color = D8.vermilion) }
        SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_open_rooms))
        val open = state.open.filter { it.game in nativeLobbyGames }
        if (open.isEmpty()) Text(androidx.compose.ui.res.stringResource(R.string.s_no_open_rooms_right_now_start), color = p.muted)
        open.forEach { l ->
            Card(color = D8.white, onClick = { act { graph.lobbies.join(l, name.ifEmpty { "Player" }) } }) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text(l.game.title, style = Type.title.copy(fontSize = 19.sp), color = D8.tyrian)
                        Text(l.targets.joinToString(" ") { Lang.flag(it) })
                    }
                    com.polingual.brand.Meter(l.players / LobbyRules.CAP.toFloat(), Modifier.weight(1f))
                    Text("${l.players}/${LobbyRules.CAP}", style = Type.mono.copy(fontSize = 16.sp), color = D8.ink)
                    if (l.isMember) Pill(androidx.compose.ui.res.stringResource(R.string.s_rejoin), D8.malachite)
                }
                Text("${l.name}, host ${l.host}${if (l.bots > 0) ", ${l.bots} bots" else ""}", style = Type.strong.copy(fontSize = 13.sp), color = p.muted)
            }
        }
        PlainLink(androidx.compose.ui.res.stringResource(R.string.s_refresh)) { scope.launch { graph.lobbies.refresh() } }
        AdBanner(graph)
    }
}

@Composable
fun RoomScreen(graph: Graph, leave: () -> Unit) {
    val p = LocalPalette.current
    val state by graph.lobbies.state.collectAsState()
    val lobby = state.current ?: return
    val scope = rememberCoroutineScope()
    var now by remember { mutableLongStateOf(graph.lobbies.nowMs) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(lobby.id) { graph.ads.enteredGame(); graph.lobbies.follow() }
    LaunchedEffect(Unit) { while (true) { now = graph.lobbies.nowMs; delay(200) } }
    val phase = foundation.bucket.core.model.LobbyClock.phase(lobby, now)
    val finished = phase == LobbyPhase.Finished
    LaunchedEffect(lobby.id, finished) { if (finished) graph.ads.gameFinished() }
    var confirmLeave by remember { mutableStateOf(false) }
    fun exit() { graph.ads.leftFinishedGame(graph.activity?.get()); leave() }
    fun act(block: suspend () -> Unit) = scope.launch { error = null; try { block() } catch (e: BucketError) { error = e.message } }
    Page(lobby.name, back = { if (phase is LobbyPhase.Round || phase is LobbyPhase.Reveal || phase is LobbyPhase.Countdown) confirmLeave = true else exit() }) {
        if (confirmLeave) {
            Text(androidx.compose.ui.res.stringResource(R.string.s_leave_this_game_your_score_stays), color = p.ink)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PlainLink(androidx.compose.ui.res.stringResource(R.string.s_leave)) { exit() }
                PlainLink(androidx.compose.ui.res.stringResource(R.string.s_keep_playing)) { confirmLeave = false }
            }
        }
        when (phase) {
            LobbyPhase.Waiting -> Waiting(graph, lobby) { act(it) }
            is LobbyPhase.Countdown -> {
                Text(androidx.compose.ui.res.stringResource(R.string.s_get_ready), style = Type.word, color = D8.tyrian)
                Text("${kotlin.math.ceil(phase.seconds).toInt()}", style = Type.mono.copy(fontSize = 96.sp), color = D8.vermilion)
            }
            is LobbyPhase.Round -> Round(graph, lobby, phase.index, phase.remaining, reveal = false)
            is LobbyPhase.Reveal -> Round(graph, lobby, phase.index, phase.remaining, reveal = true)
            LobbyPhase.Finished -> Results(lobby, again = { exit() })
        }
        error?.let { Text(it, color = D8.vermilion) }
        if (phase == LobbyPhase.Waiting || phase == LobbyPhase.Finished) Chat(graph, lobby) { act(it) }
    }
}

@Composable
private fun Waiting(graph: Graph, lobby: Lobby, act: (suspend () -> Unit) -> Unit) {
    val p = LocalPalette.current
    Card(color = D8.tyrianDeep) {
        com.polingual.brand.Label(androidx.compose.ui.res.stringResource(R.string.s_code), color = D8.parchment)
        Text(lobby.code, style = Type.mono.copy(fontSize = 52.sp, letterSpacing = 8.sp), color = D8.ochre)
        Text("bucket.foundation/play/${lobby.code}", style = Type.strong, color = D8.parchment.copy(alpha = 0.8f))
    }
    Text(androidx.compose.ui.res.stringResource(R.string.s_x_x_rounds_x_seconds_each, lobby.game.title, lobby.rounds, lobby.roundSeconds), color = p.muted)
    Players(lobby)
    val me = lobby.me
    PrimaryButton(if (me?.ready == true) androidx.compose.ui.res.stringResource(R.string.s_not_ready) else androidx.compose.ui.res.stringResource(R.string.s_i_m_ready), color = if (me?.ready == true) D8.lapis else D8.malachite) { act { graph.lobbies.setReady(me?.ready != true) } }
    if (lobby.isHost) {
        PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_start_game), enabled = lobby.canStart) { act { graph.lobbies.start() } }
        if (!lobby.canStart) Text(androidx.compose.ui.res.stringResource(R.string.s_two_ready_players_start_the_game), color = p.muted)
        if (lobby.botsEnabled && !lobby.botFill) PlainLink(androidx.compose.ui.res.stringResource(R.string.s_fill_empty_seats_with_bots)) { act { graph.lobbies.fillBots() } }
    }
}

@Composable
private fun Players(lobby: Lobby) {
    val p = LocalPalette.current
    lobby.standings.forEach { pl ->
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(p.card).padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(10.dp).clip(RoundedCornerShape(50)).background(if (pl.online || pl.bot) D8.malachite else p.rule))
            Text(listOfNotNull(pl.flag?.let(Lang::flag), pl.name).joinToString(" "), color = p.ink, fontWeight = if (pl.isMe) FontWeight.ExtraBold else FontWeight.Normal, modifier = Modifier.weight(1f))
            if (pl.bot) Pill(androidx.compose.ui.res.stringResource(R.string.s_bot), D8.lapis)
            if (pl.isHost) Pill(androidx.compose.ui.res.stringResource(R.string.s_host), D8.vermilion)
            if (lobby.status == LobbyStatus.Lobby) Text(if (pl.ready) androidx.compose.ui.res.stringResource(R.string.s_ready) else androidx.compose.ui.res.stringResource(R.string.s_waiting), color = if (pl.ready) D8.malachite else p.muted)
            else Text("${pl.score}", fontWeight = FontWeight.Bold, color = p.ink)
        }
    }
}

@Composable
private fun Round(graph: Graph, lobby: Lobby, index: Int, remaining: Double, reveal: Boolean) {
    val p = LocalPalette.current
    val state by graph.lobbies.state.collectAsState()
    val scope = rememberCoroutineScope()
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(androidx.compose.ui.res.stringResource(R.string.s_round_x_of_x, index + 1, lobby.rounds), style = Type.title.copy(fontSize = 18.sp), color = D8.tyrian, modifier = Modifier.weight(1f))
        Text("${kotlin.math.ceil(remaining).toInt()}s", style = Type.title.copy(fontSize = 18.sp), color = if (remaining < 3 && !reveal) D8.vermilion else p.ink)
    }
    val prompt = lobby.prompt(index)
    if (prompt == null) { Text(androidx.compose.ui.res.stringResource(R.string.s_loading_the_round), color = p.muted); return }
    if (prompt.mode == LobbyPromptMode.Flag) {
        Text(androidx.compose.ui.res.stringResource(R.string.s_which_language), color = p.muted)
        Text(prompt.gloss, style = Type.word, color = D8.tyrian)
    } else {
        Text(prompt.lang?.let { androidx.compose.ui.res.stringResource(R.string.s_which_is_x_for, Lang.name(it)) } ?: androidx.compose.ui.res.stringResource(R.string.s_which_word_means), color = p.muted)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            prompt.lang?.let { Text(Lang.flag(it), fontSize = 30.sp) }
            Text(prompt.gloss, style = Type.word, color = D8.tyrian)
        }
    }
    val picked = state.picks[index]
    val mark = state.marks[index]
    prompt.choices.forEach { c ->
        val label = if (prompt.mode == LobbyPromptMode.Flag) "${Lang.flag(c)}  ${Lang.name(c)}" else c
        val s = when {
            prompt.answer != null && c == prompt.answer -> ChoiceState.Right
            picked == c && mark == false -> ChoiceState.Wrong
            picked == c && mark == true -> ChoiceState.Right
            picked != null || reveal -> ChoiceState.Dim
            else -> ChoiceState.Idle
        }
        ChoiceButton(label, if (s == ChoiceState.Idle && (reveal || picked != null)) ChoiceState.Dim else s) {
            if (!reveal && picked == null) scope.launch { graph.lobbies.pick(c, index) }
        }
    }
    when {
        picked != null && mark == null -> Text(androidx.compose.ui.res.stringResource(R.string.s_checking), color = p.muted)
        mark == true -> Text(androidx.compose.ui.res.stringResource(R.string.q_right), color = D8.malachite, fontWeight = FontWeight.Bold)
        mark == false -> Text(androidx.compose.ui.res.stringResource(R.string.s_not_this_time), color = D8.vermilion, fontWeight = FontWeight.Bold)
    }
    if (reveal) prompt.reveal.forEach { r -> Text("${Lang.flag(r.lang)} ${r.word}${r.roman?.let { " ($it)" } ?: ""}: ${r.meaning}", color = if (r.correct) D8.malachite else p.muted) }
    Players(lobby)
}

@Composable
private fun Results(lobby: Lobby, again: () -> Unit) {
    val p = LocalPalette.current
    Text(androidx.compose.ui.res.stringResource(R.string.s_results), style = Type.display, color = D8.tyrian)
    lobby.standings.forEachIndexed { i, pl ->
        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
            Text("${i + 1}", fontWeight = FontWeight.Bold, color = if (i == 0) D8.vermilion else p.ink, modifier = Modifier.padding(end = 12.dp))
            Text(pl.name + if (pl.isMe) " (you)" else "", color = p.ink, modifier = Modifier.weight(1f))
            Text("${pl.score}", fontWeight = FontWeight.Bold, color = p.ink)
        }
    }
    SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_words))
    lobby.prompts.forEach { pr -> Text(if (pr.mode == LobbyPromptMode.Flag) "${pr.gloss}: ${pr.answer?.let(Lang::name).orEmpty()}" else "${pr.answer.orEmpty()}: ${pr.gloss}", color = p.ink) }
    PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_leave_room), color = D8.lapis, onClick = again)
}

@Composable
private fun Chat(graph: Graph, lobby: Lobby, act: (suspend () -> Unit) -> Unit) {
    val p = LocalPalette.current
    var text by remember { mutableStateOf("") }
    SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_chat))
    lobby.messages.takeLast(20).forEach { m -> Text("${m.name}: ${m.body}", color = p.ink) }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(text, { text = it.take(200) }, singleLine = true, label = { Text(androidx.compose.ui.res.stringResource(R.string.s_message)) }, modifier = Modifier.weight(1f))
        PlainLink(androidx.compose.ui.res.stringResource(R.string.s_send)) { val t = text; text = ""; act { graph.lobbies.send(t) } }
    }
}
