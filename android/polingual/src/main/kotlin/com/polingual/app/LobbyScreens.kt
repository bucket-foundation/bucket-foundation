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
import foundation.bucket.core.ui.pl.Pill
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun LobbiesScreen(graph: Graph, code: String, preset: String = "", go: (String) -> Unit = {}, back: () -> Unit) {
    val state by graph.lobbies.state.collectAsState()
    val app by graph.state.collectAsState()
    val stage by graph.account.stage.collectAsState()
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    var joinCode by remember { mutableStateOf(code) }
    var nick by remember(app?.nickname) { mutableStateOf(app?.nickname.orEmpty()) }
    var game by remember { mutableStateOf(LobbyGame.entries.firstOrNull { it.wire == preset && foundation.bucket.core.model.LobbyGames.playable(it) } ?: LobbyGame.Daily) }
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
    if (state.current != null) { RoomScreen(graph, go) { scope.launch { graph.lobbies.leave() } }; return }
    Page("Live rooms", back = back, ground = Ground.Lattice, panel = true, stickers = listOf(Sticker("pebble", Alignment.CenterStart, 60.dp, -12f), Sticker("seal", Alignment.TopEnd, 50.dp, 9f), Sticker("bunting", Alignment.BottomEnd, 90.dp, -4f, dx = (-8).dp))) {
        Text("Play the same round with friends, live. Web and iPhone players join with the same code.", color = PL.InkDim)
        OutlinedTextField(nick, { nick = it.take(40) }, singleLine = true, label = { Text(if (signedIn) "Display name" else "Your name") }, modifier = Modifier.fillMaxWidth())
        FamilyCopy.leftRoom(state.left)?.let { Text(it, color = PL.InkDim) }
        JoinByCode(joinCode, { joinCode = it }, enabled = joinCode.length == LobbyRules.CODE_LENGTH && !state.busy) { act { graph.lobbies.join(joinCode, name.ifEmpty { "Player" }) } }
        if (joinCode.length == LobbyRules.CODE_LENGTH) PlainLink("Watch from the audience") { act { graph.lobbies.watch(joinCode, name.ifEmpty { "Guest" }) } }
        val system = app?.system
        Card {
            Text("Start a room", style = Type.caps, color = PL.InkDim)
            androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                foundation.bucket.core.model.LobbyGames.offered(state.games, state.race).forEach { g -> PLPill(g.title, active = g == game) { game = g } }
            }
            if (!foundation.bucket.core.model.LobbyGames.playable(game)) Text("${game.title} races play on the web and iPhone. Pick another game to host from Android.", color = PL.InkDim)
            else if (game.isRace) Text("Race: everyone plays the same deck, highest score wins.", color = PL.InkDim)
            if (state.botsEnabled) Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Fill empty seats with bots", color = PL.Ink, modifier = Modifier.weight(1f))
                foundation.bucket.core.ui.pl.PLToggle(bots, { bots = it }, "Fill empty seats with bots")
            }
            if (system == null) Text("Start a language set in Learn first.", color = PL.InkDim)
            PrimaryButton("Create room", enabled = system != null && !state.busy && foundation.bucket.core.model.LobbyGames.playable(game)) {
                val s = system ?: return@PrimaryButton
                act {
                    graph.lobbies.create("${name.ifEmpty { "Polingual" }}'s room", game, s.root, s.targets, name.ifEmpty { "Host" })
                    if (bots) graph.lobbies.fillBots()
                }
            }
        }
        error?.let { Text(it, color = PL.Vermilion) }
        OpenRooms(state.open.filter { foundation.bucket.core.model.LobbyGames.playable(it.game) }) { l -> act { graph.lobbies.join(l, name.ifEmpty { "Player" }) } }
        PlainLink("Refresh") { scope.launch { graph.lobbies.refresh() } }
        if (signedIn) LeagueCard(graph)
        AdBanner(graph)
    }
}

@Composable
fun RoomScreen(graph: Graph, go: (String) -> Unit = {}, leave: () -> Unit) {
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
    if (lobby.game.isRace && (phase is LobbyPhase.Round || phase is LobbyPhase.Reveal)) {
        RaceRoom(graph, lobby, lobby.raceRemaining(now), state.raceScore) { exit() }
        return
    }
    fun act(block: suspend () -> Unit) = scope.launch { error = null; try { block() } catch (e: BucketError) { error = LobbyErrors.text(e) } }
    Page(lobby.name, ground = Ground.Lattice, panel = true, stickers = listOf(Sticker("pebble", Alignment.CenterStart, 60.dp, -12f), Sticker("seal", Alignment.TopEnd, 50.dp, 9f), Sticker("bunting", Alignment.BottomEnd, 90.dp, -4f, dx = (-8).dp)), back = { if (phase is LobbyPhase.Round || phase is LobbyPhase.Reveal || phase is LobbyPhase.Countdown) confirmLeave = true else exit() }) {
        if (confirmLeave) {
            Text("Leave this game? Your score stays where it is.", color = PL.Ink)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PlainLink("Leave") { exit() }
                PlainLink("Keep playing") { confirmLeave = false }
            }
        }
        val interlude = if (finished) lobby.interlude(now) else null
        when {
            state.audience -> AudienceView(graph, lobby, phase)
            phase == LobbyPhase.Waiting -> Waiting(graph, lobby, graph.state.value?.nickname.orEmpty()) { act(it) }
            phase is LobbyPhase.Countdown -> {
                Text("Get ready", style = Type.word, color = PL.Ink)
                Text("${kotlin.math.ceil((phase as LobbyPhase.Countdown).seconds).toInt()}", style = Type.count, color = PL.Vermilion)
            }
            phase is LobbyPhase.Round -> Round(graph, lobby, phase.index, phase.remaining, reveal = false)
            phase is LobbyPhase.Reveal -> Round(graph, lobby, phase.index, phase.remaining, reveal = true)
            interlude != null -> {
                lobby.night?.let { Text("Family night, ${it.label} done", style = Type.caps, color = PL.InkDim) }
                InterludePanel(graph, lobby, interlude, now)
                NextGamePanel(graph, lobby, now, { exit() }) { act(it) }
            }
            phase == LobbyPhase.Finished -> Results(graph, lobby, go) {
                NextGamePanel(graph, lobby, now, { exit() }) { act(it) }
            }
        }
        error?.let { Text(it, color = PL.Vermilion) }
        if (phase == LobbyPhase.Waiting || phase == LobbyPhase.Finished) Chat(graph, lobby) { act(it) }
    }
}

@Composable
private fun Waiting(graph: Graph, lobby: Lobby, nickname: String, act: (suspend () -> Unit) -> Unit) {
    Card(color = PL.Ink) {
        Text("Code", color = PL.Paper.copy(alpha = 0.7f), style = Type.caps)
        Text(lobby.code, style = Type.display.copy(letterSpacing = 6.sp), color = PL.Paper)
        Text("bucket.foundation/play/${lobby.code}", color = PL.Paper.copy(alpha = 0.8f))
    }
    Text("${lobby.game.title}, ${lobby.rounds} rounds, ${lobby.roundSeconds} seconds each", color = PL.InkDim)
    Players(lobby)
    val me = lobby.me
    if (me != null) {
        PrimaryButton(if (me.ready) "Not ready" else "I'm ready", color = if (me.ready) PL.Lapis else PL.Malachite) { act { graph.lobbies.setReady(!me.ready) } }
        PlayerCardPanel(graph, lobby)
    } else if (lobby.isHost) Text("You host on this screen. Players join on their phones.", color = PL.InkDim)
    if (lobby.isHost) HostControls(graph, lobby, nickname, act)
    else Text(FamilyCopy.waitingOn(lobby), color = PL.InkDim)
}

@Composable
private fun Players(lobby: Lobby) {
    lobby.standings.forEach { pl ->
        Row(Modifier.fillMaxWidth().plSurface(PL.Card, PLRadius.sm).padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(10.dp).plSurface(if (pl.online || pl.bot) PL.Malachite else PL.Hairline2, foundation.bucket.core.ui.pl.PLRadius.pill))
            Text(listOfNotNull(pl.flag?.let(Lang::flag), pl.name).joinToString(" "), color = PL.Ink, fontWeight = if (pl.isMe) FontWeight.ExtraBold else FontWeight.Normal, modifier = Modifier.weight(1f))
            if (pl.bot) Pill("Bot", PL.Lapis)
            if (pl.isHost) Pill("Host", PL.Vermilion)
            if (lobby.status == LobbyStatus.Lobby) Text(if (pl.ready) "Ready" else "Waiting", color = if (pl.ready) PL.Malachite else PL.InkDim)
            else Text("${pl.score}", fontWeight = FontWeight.Bold, color = PL.Ink)
        }
    }
}

@Composable
private fun Round(graph: Graph, lobby: Lobby, index: Int, remaining: Double, reveal: Boolean) {
    val state by graph.lobbies.state.collectAsState()
    val scope = rememberCoroutineScope()
    RoundHeader(lobby, index, remaining, reveal)
    val prompt = lobby.prompt(index)
    if (prompt == null) { Text("Loading the round", color = PL.InkDim); return }
    if (prompt.mode == LobbyPromptMode.Tiles) {
        TileRound(graph, lobby, prompt, index, remaining, reveal)
        Players(lobby)
        return
    }
    if (prompt.mode == LobbyPromptMode.Spy) {
        SpyRound(graph, prompt, index, reveal)
        Players(lobby)
        return
    }
    if (prompt.mode == LobbyPromptMode.Flag || prompt.mode == LobbyPromptMode.Voice) {
        Text("Which language?", color = PL.InkDim)
        WordCard(null, prompt.gloss, tilt = 0f)
    } else if (prompt.mode == LobbyPromptMode.Meaning) {
        Text("What does this mean?", color = PL.InkDim)
        WordCard(prompt.lang, prompt.gloss, tilt = 0f)
    } else {
        Text(prompt.lang?.let { "Which is ${Lang.name(it)} for" } ?: "Which word means", color = PL.InkDim)
        WordCard(prompt.lang, prompt.gloss, tilt = 0f)
    }
    val picked = state.picks[index]
    val mark = state.marks[index]
    prompt.choices.filter { it !in prompt.hide }.forEach { c ->
        val label = when (prompt.mode) {
            LobbyPromptMode.Flag, LobbyPromptMode.Voice -> "${Lang.flag(c)}  ${Lang.name(c)}"
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
        picked != null && mark == null -> Text("Checking", color = PL.InkDim)
        mark == true -> Text("Right", color = PL.Malachite, fontWeight = FontWeight.Bold)
        mark == false -> Text("Not this time.", color = PL.Vermilion, fontWeight = FontWeight.Bold)
    }
    if (com.polingual.app.play.RevealRules.sameWord(revealPhase = reveal)) {
        prompt.reveal.firstOrNull { it.correct }?.let { r -> WordReveal(r.lang, r.word, CardRoot.lobby(r, lobby.root)?.text.orEmpty(), null, null, rootLang = lobby.root) { graph.voice.speak(r.word, r.lang) } }
        prompt.reveal.filterNot { it.correct }.forEach { r -> Text("${Lang.name(r.lang)}: ${r.word}${r.roman?.let { " ($it)" } ?: ""}, ${r.meaning}", style = Type.small, color = PL.InkDim) }
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
private fun Results(graph: Graph, lobby: Lobby, go: (String) -> Unit, next: @Composable () -> Unit) {
    val stage by graph.account.stage.collectAsState()
    val access by graph.billing.access.collectAsState()
    val cta = ResultsUpsell.of(stage, access)
    Text("Results", style = Type.display, color = PL.Ink)
    next()
    lobby.standings.forEachIndexed { i, pl ->
        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
            Text("${i + 1}", fontWeight = FontWeight.Bold, color = if (i == 0) PL.Vermilion else PL.Ink, modifier = Modifier.padding(end = 12.dp))
            Text(pl.name + if (pl.isMe) " (you)" else "", color = PL.Ink, modifier = Modifier.weight(1f))
            Text("${pl.score}", fontWeight = FontWeight.Bold, color = PL.Ink)
        }
    }
    SectionTitle("Words")
    lobby.prompts.forEach { pr -> Text(resultLine(pr), color = PL.Ink) }
    if (cta.save) Card {
        Text("Save your progress", style = Type.title, color = PL.Ink)
        Text("You scored ${lobby.standings.firstOrNull { it.isMe }?.score ?: 0} points. Sign in to keep your streak, stats and game history. Your guest games come with you.", color = PL.Ink)
        PrimaryButton("Sign in to save", color = PL.Malachite, onClick = { go(ResultsUpsell.SIGN_IN) })
    }
    if (cta.learn) Card {
        Text("Learn these words", style = Type.title, color = PL.Ink)
        Text("Lessons turn the words from this game into words you keep.", color = PL.Ink)
        PrimaryButton("Start learning", color = PL.Vermilion, onClick = { go(ResultsUpsell.PAYWALL) })
    }
}

@Composable
private fun Chat(graph: Graph, lobby: Lobby, act: (suspend () -> Unit) -> Unit) {
    var text by remember { mutableStateOf("") }
    SectionTitle("Chat")
    val blocked by graph.chatBlocks.blocked.collectAsState()
    LaunchedEffect(Unit) { graph.chatBlocks.sync() }
    graph.chatBlocks.visible(lobby.messages, blocked).takeLast(20).forEach { m ->
        ChatLine(m, lobby.me?.userId, lobby.players.filter { it.bot }.map { it.userId }.toSet(), report = { id, r -> graph.lobbies.report(id, r) }, block = { id, name -> graph.chatBlocks.block(id, name) })
    }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(text, { text = it.take(200) }, singleLine = true, label = { Text("Message") }, modifier = Modifier.weight(1f))
        PlainLink("Send") { val t = text; text = ""; act { graph.lobbies.send(t) } }
    }
}

fun resultLine(pr: foundation.bucket.core.model.LobbyPrompt): String = when (pr.mode) {
    LobbyPromptMode.Flag, LobbyPromptMode.Voice -> "${pr.gloss}: ${pr.answer?.let(Lang::name).orEmpty()}"
    LobbyPromptMode.Tiles -> "${pr.gloss}: " + pr.answer.orEmpty().split(',').mapNotNull { it.toIntOrNull()?.let(pr.choices::getOrNull) }.joinToString(", ") { foundation.bucket.core.model.LobbyTiles.parse(it).form }
    LobbyPromptMode.Mixed -> "${pr.gloss}: ${pr.answer?.let { foundation.bucket.core.model.LobbyTiles.parse(it).form }.orEmpty()}"
    else -> "${pr.answer.orEmpty()}: ${pr.gloss}"
}

@Composable
private fun JoinByCode(code: String, onCode: (String) -> Unit, enabled: Boolean, onJoin: () -> Unit) {
    Card {
        Text("Join with a code", style = Type.caps, color = PL.InkDim)
        OutlinedTextField(code, { onCode(it.filter(Char::isLetterOrDigit).uppercase().take(LobbyRules.CODE_LENGTH)) }, singleLine = true, label = { Text("Room code") },
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters), modifier = Modifier.fillMaxWidth())
        PrimaryButton("Join", enabled = enabled, color = PL.Malachite, onClick = onJoin)
    }
}

@Composable
private fun OpenRooms(open: List<foundation.bucket.core.model.LobbySummary>, onJoin: (foundation.bucket.core.model.LobbySummary) -> Unit) {
    SectionTitle("Open rooms")
    if (open.isEmpty()) Text("No open rooms right now. Start one and share the code.", color = PL.InkDim)
    open.forEach { l ->
        Card(onClick = { onJoin(l) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(l.name, color = PL.Ink, fontWeight = FontWeight.Bold)
                    Text("${l.game.title} · ${l.host} · ${l.players} of ${LobbyRules.CAP}${if (l.bots > 0) " · ${l.bots} bots" else ""}", color = PL.InkDim)
                    Text(l.targets.joinToString(" ") { Lang.flag(it) })
                }
                if (l.isMember) Pill("Rejoin", PL.Malachite)
            }
        }
    }
}

@Composable
private fun RoundHeader(lobby: Lobby, index: Int, remaining: Double, reveal: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("Round ${index + 1} of ${lobby.rounds}", style = Type.subhead, color = PL.Ink, modifier = Modifier.weight(1f))
        Text("${kotlin.math.ceil(remaining).toInt()}s", style = Type.subhead, color = if (remaining < 3 && !reveal) PL.Vermilion else PL.Ink)
    }
    if (lobby.game == LobbyGame.Duel) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Coins ${lobby.coins}", style = Type.small, color = PL.OchreDeep, modifier = Modifier.weight(1f))
            if (lobby.doubled(index)) foundation.bucket.core.ui.pl.PLBadge("Double points", foundation.bucket.core.ui.pl.BadgeTone.Ochre)
        }
    }
}

