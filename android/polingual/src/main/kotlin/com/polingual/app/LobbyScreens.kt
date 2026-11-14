package com.polingual.app

import foundation.bucket.core.ui.pl.*
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

val nativeLobbyGames = listOf(LobbyGame.Daily, LobbyGame.SameWord, LobbyGame.Flags, LobbyGame.Live, LobbyGame.Duel, LobbyGame.Tiles)

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun LobbiesScreen(graph: Graph, code: String, preset: String = "", back: () -> Unit) {
    val p = LocalPalette.current
    val state by graph.lobbies.state.collectAsState()
    val app by graph.state.collectAsState()
    val stage by graph.account.stage.collectAsState()
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    var joinCode by remember { mutableStateOf(code) }
    var nick by remember(app?.nickname) { mutableStateOf(app?.nickname.orEmpty()) }
    var game by remember { mutableStateOf(nativeLobbyGames.firstOrNull { it.wire == preset } ?: LobbyGame.Daily) }
    var bots by remember { mutableStateOf(false) }
    val signedIn = stage == Stage.SignedIn
    val name = nick.trim()
    fun act(block: suspend () -> Unit) = scope.launch {
        error = null
        if (!signedIn && name.isEmpty()) { error = "Pick a name to play live."; return@launch }
        if (name != app?.nickname) graph.store.update { it.copy(nickname = name) }
        try { block() } catch (e: BucketError) { error = LobbyErrors.text(e) }
    }
    LaunchedEffect(Unit) { graph.lobbies.refresh() }
    LaunchedEffect(code) { if (code.isNotBlank() && (signedIn || name.isNotEmpty()) && state.current == null) act { graph.lobbies.join(code, name.ifEmpty { "Player" }) } }
    if (state.current != null) { RoomScreen(graph) { scope.launch { graph.lobbies.leave() } }; return }
    Page("Live rooms", back = back, ground = Ground.Lattice, panel = true, stickers = listOf(Sticker("pebble", Alignment.CenterStart, 60.dp, -12f), Sticker("seal", Alignment.TopEnd, 50.dp, 9f), Sticker("bunting", Alignment.BottomEnd, 90.dp, -4f, dx = (-8).dp))) {
        Text("Play the same round with friends, live. Web and iPhone players join with the same code.", color = p.muted)
        OutlinedTextField(nick, { nick = it.take(40) }, singleLine = true, label = { Text(if (signedIn) "Display name" else "Your name") }, modifier = Modifier.fillMaxWidth())
        Card {
            Text("Join with a code", style = Type.caps, color = p.muted)
            OutlinedTextField(joinCode, { joinCode = it.filter(Char::isLetterOrDigit).uppercase().take(LobbyRules.CODE_LENGTH) }, singleLine = true, label = { Text("Room code") },
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters), modifier = Modifier.fillMaxWidth())
            PrimaryButton("Join", enabled = joinCode.length == LobbyRules.CODE_LENGTH && !state.busy, color = PL.Malachite) { act { graph.lobbies.join(joinCode, name.ifEmpty { "Player" }) } }
        }
        val system = app?.system
        Card {
            Text("Start a room", style = Type.caps, color = p.muted)
            androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                foundation.bucket.core.model.LobbyGames.offered(state.games).forEach { g -> PLPill(g.title, active = g == game) { game = g } }
            }
            if (state.botsEnabled) Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Fill empty seats with bots", color = p.ink, modifier = Modifier.weight(1f))
                Switch(bots, { bots = it })
            }
            if (system == null) Text("Start a language set in Learn first.", color = p.muted)
            PrimaryButton("Create room", enabled = system != null && !state.busy) {
                val s = system ?: return@PrimaryButton
                act {
                    graph.lobbies.create("${name.ifEmpty { "Polingual" }}'s room", game, s.root, s.targets, name.ifEmpty { "Host" })
                    if (bots) graph.lobbies.fillBots()
                }
            }
        }
        error?.let { Text(it, color = PL.Vermilion) }
        SectionTitle("Open rooms")
        val open = state.open.filter { it.game in nativeLobbyGames }
        if (open.isEmpty()) Text("No open rooms right now. Start one and share the code.", color = p.muted)
        open.forEach { l ->
            Card(onClick = { act { graph.lobbies.join(l, name.ifEmpty { "Player" }) } }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(l.name, color = p.ink, fontWeight = FontWeight.Bold)
                        Text("${l.game.title} · ${l.host} · ${l.players} of ${LobbyRules.CAP}${if (l.bots > 0) " · ${l.bots} bots" else ""}", color = p.muted)
                        Text(l.targets.joinToString(" ") { Lang.flag(it) })
                    }
                    if (l.isMember) Pill("Rejoin", PL.Malachite)
                }
            }
        }
        PlainLink("Refresh") { scope.launch { graph.lobbies.refresh() } }
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
    fun act(block: suspend () -> Unit) = scope.launch { error = null; try { block() } catch (e: BucketError) { error = LobbyErrors.text(e) } }
    Page(lobby.name, ground = Ground.Lattice, panel = true, stickers = listOf(Sticker("pebble", Alignment.CenterStart, 60.dp, -12f), Sticker("seal", Alignment.TopEnd, 50.dp, 9f), Sticker("bunting", Alignment.BottomEnd, 90.dp, -4f, dx = (-8).dp)), back = { if (phase is LobbyPhase.Round || phase is LobbyPhase.Reveal || phase is LobbyPhase.Countdown) confirmLeave = true else exit() }) {
        if (confirmLeave) {
            Text("Leave this game? Your score stays where it is.", color = p.ink)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PlainLink("Leave") { exit() }
                PlainLink("Keep playing") { confirmLeave = false }
            }
        }
        when (phase) {
            LobbyPhase.Waiting -> Waiting(graph, lobby) { act(it) }
            is LobbyPhase.Countdown -> {
                Text("Get ready", style = Type.word, color = p.ink)
                Text("${kotlin.math.ceil(phase.seconds).toInt()}", style = Type.display.copy(fontSize = 96.sp), color = PL.Vermilion)
            }
            is LobbyPhase.Round -> Round(graph, lobby, phase.index, phase.remaining, reveal = false)
            is LobbyPhase.Reveal -> Round(graph, lobby, phase.index, phase.remaining, reveal = true)
            LobbyPhase.Finished -> Results(lobby, again = { exit() })
        }
        error?.let { Text(it, color = PL.Vermilion) }
        if (phase == LobbyPhase.Waiting || phase == LobbyPhase.Finished) Chat(graph, lobby) { act(it) }
    }
}

@Composable
private fun Waiting(graph: Graph, lobby: Lobby, act: (suspend () -> Unit) -> Unit) {
    val p = LocalPalette.current
    Card(color = PL.Ink) {
        Text("Code", color = PL.Paper.copy(alpha = 0.7f), style = Type.caps)
        Text(lobby.code, style = Type.display.copy(letterSpacing = 6.sp), color = PL.Paper)
        Text("bucket.foundation/play/${lobby.code}", color = PL.Paper.copy(alpha = 0.8f))
    }
    Text("${lobby.game.title}, ${lobby.rounds} rounds, ${lobby.roundSeconds} seconds each", color = p.muted)
    Players(lobby)
    val me = lobby.me
    PrimaryButton(if (me?.ready == true) "Not ready" else "I'm ready", color = if (me?.ready == true) PL.Lapis else PL.Malachite) { act { graph.lobbies.setReady(me?.ready != true) } }
    if (lobby.isHost) {
        PrimaryButton("Start game", enabled = lobby.canStart) { act { graph.lobbies.start() } }
        if (!lobby.canStart) Text("Two ready players start the game.", color = p.muted)
        if (lobby.botsEnabled && !lobby.botFill) PlainLink("Fill empty seats with bots") { act { graph.lobbies.fillBots() } }
    }
}

@Composable
private fun Players(lobby: Lobby) {
    val p = LocalPalette.current
    lobby.standings.forEach { pl ->
        Row(Modifier.fillMaxWidth().plSurface(p.card, 12.dp).padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(10.dp).plSurface(if (pl.online || pl.bot) PL.Malachite else p.rule, foundation.bucket.core.ui.pl.PLRadius.pill))
            Text(listOfNotNull(pl.flag?.let(Lang::flag), pl.name).joinToString(" "), color = p.ink, fontWeight = if (pl.isMe) FontWeight.ExtraBold else FontWeight.Normal, modifier = Modifier.weight(1f))
            if (pl.bot) Pill("Bot", PL.Lapis)
            if (pl.isHost) Pill("Host", PL.Vermilion)
            if (lobby.status == LobbyStatus.Lobby) Text(if (pl.ready) "Ready" else "Waiting", color = if (pl.ready) PL.Malachite else p.muted)
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
        Text("Round ${index + 1} of ${lobby.rounds}", style = Type.title.copy(fontSize = 18.sp), color = p.ink, modifier = Modifier.weight(1f))
        Text("${kotlin.math.ceil(remaining).toInt()}s", style = Type.title.copy(fontSize = 18.sp), color = if (remaining < 3 && !reveal) PL.Vermilion else p.ink)
    }
    val prompt = lobby.prompt(index)
    if (prompt == null) { Text("Loading the round", color = p.muted); return }
    if (lobby.game == LobbyGame.Duel) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Coins ${lobby.coins}", style = Type.small, color = PL.OchreDeep, modifier = Modifier.weight(1f))
            if (lobby.doubled(index)) foundation.bucket.core.ui.pl.PLBadge("Double points", foundation.bucket.core.ui.pl.BadgeTone.Ochre)
        }
    }
    if (prompt.mode == LobbyPromptMode.Tiles) {
        TileRound(graph, lobby, prompt, index, remaining, reveal)
        Players(lobby)
        return
    }
    if (prompt.mode == LobbyPromptMode.Flag) {
        Text("Which language?", color = p.muted)
        WordCard(null, prompt.gloss, tilt = 0f)
    } else if (prompt.mode == LobbyPromptMode.Meaning) {
        Text("What does this mean?", color = p.muted)
        WordCard(prompt.lang, prompt.gloss, tilt = 0f)
    } else {
        Text(prompt.lang?.let { "Which is ${Lang.name(it)} for" } ?: "Which word means", color = p.muted)
        WordCard(prompt.lang, prompt.gloss, tilt = 0f)
    }
    val picked = state.picks[index]
    val mark = state.marks[index]
    prompt.choices.filter { it !in prompt.hide }.forEach { c ->
        val label = when (prompt.mode) {
            LobbyPromptMode.Flag -> "${Lang.flag(c)}  ${Lang.name(c)}"
            LobbyPromptMode.Mixed -> foundation.bucket.core.model.LobbyTiles.parse(c).let { "${Lang.flag(it.lang)}  ${it.form}" }
            else -> c
        }
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
        picked != null && mark == null -> Text("Checking", color = p.muted)
        mark == true -> Text("Right", color = PL.Malachite, fontWeight = FontWeight.Bold)
        mark == false -> Text("Not this time.", color = PL.Vermilion, fontWeight = FontWeight.Bold)
    }
    if (com.polingual.app.play.RevealRules.sameWord(revealPhase = reveal)) {
        prompt.reveal.firstOrNull { it.correct }?.let { r -> WordReveal(r.lang, r.word, CardRoot.lobby(r, lobby.root)?.text.orEmpty(), null, null, rootLang = lobby.root) { graph.voice.speak(r.word, r.lang) } }
        prompt.reveal.filterNot { it.correct }.forEach { r -> Text("${Lang.name(r.lang)}: ${r.word}${r.roman?.let { " ($it)" } ?: ""}, ${r.meaning}", style = Type.small, color = p.muted) }
        if (lobby.game == LobbyGame.Duel && index + 1 < lobby.rounds) DuelPowers(graph, lobby, index + 1)
    }
    Players(lobby)
}

@Composable
private fun DuelPowers(graph: Graph, lobby: Lobby, next: Int) {
    val scope = rememberCoroutineScope()
    SectionTitle("Power-up for round ${next + 1}")
    val set = lobby.powerFor(next)
    if (set != null) Text(if (set.kind == foundation.bucket.core.model.PowerKind.Double) "Double points is on for the next round." else "50/50 is on for the next round.", style = Type.small, color = PL.Malachite)
    else Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        foundation.bucket.core.ui.pl.PLButton("Double, 2 coins", Modifier.weight(1f), variant = foundation.bucket.core.ui.pl.ButtonVariant.Gold, size = foundation.bucket.core.ui.pl.ButtonSize.Md, enabled = lobby.coins >= 2) { scope.launch { runCatching { graph.lobbies.power(foundation.bucket.core.model.PowerKind.Double) } } }
        foundation.bucket.core.ui.pl.PLButton("50/50, 1 coin", Modifier.weight(1f), variant = foundation.bucket.core.ui.pl.ButtonVariant.Accent, size = foundation.bucket.core.ui.pl.ButtonSize.Md, enabled = lobby.coins >= 1) { scope.launch { runCatching { graph.lobbies.power(foundation.bucket.core.model.PowerKind.Fifty) } } }
    }
}

@Composable
private fun Results(lobby: Lobby, again: () -> Unit) {
    val p = LocalPalette.current
    Text("Results", style = Type.display, color = p.ink)
    lobby.standings.forEachIndexed { i, pl ->
        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
            Text("${i + 1}", fontWeight = FontWeight.Bold, color = if (i == 0) PL.Vermilion else p.ink, modifier = Modifier.padding(end = 12.dp))
            Text(pl.name + if (pl.isMe) " (you)" else "", color = p.ink, modifier = Modifier.weight(1f))
            Text("${pl.score}", fontWeight = FontWeight.Bold, color = p.ink)
        }
    }
    SectionTitle("Words")
    lobby.prompts.forEach { pr -> Text(resultLine(pr), color = p.ink) }
    PrimaryButton("Leave room", color = PL.Lapis, onClick = again)
}

@Composable
private fun Chat(graph: Graph, lobby: Lobby, act: (suspend () -> Unit) -> Unit) {
    val p = LocalPalette.current
    var text by remember { mutableStateOf("") }
    SectionTitle("Chat")
    lobby.messages.takeLast(20).forEach { m -> Text("${m.name}: ${m.body}", color = p.ink) }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(text, { text = it.take(200) }, singleLine = true, label = { Text("Message") }, modifier = Modifier.weight(1f))
        PlainLink("Send") { val t = text; text = ""; act { graph.lobbies.send(t) } }
    }
}

fun resultLine(pr: foundation.bucket.core.model.LobbyPrompt): String = when (pr.mode) {
    LobbyPromptMode.Flag -> "${pr.gloss}: ${pr.answer?.let(Lang::name).orEmpty()}"
    LobbyPromptMode.Tiles -> "${pr.gloss}: " + pr.answer.orEmpty().split(',').mapNotNull { it.toIntOrNull()?.let(pr.choices::getOrNull) }.joinToString(", ") { foundation.bucket.core.model.LobbyTiles.parse(it).form }
    LobbyPromptMode.Mixed -> "${pr.gloss}: ${pr.answer?.let { foundation.bucket.core.model.LobbyTiles.parse(it).form }.orEmpty()}"
    else -> "${pr.answer.orEmpty()}: ${pr.gloss}"
}
