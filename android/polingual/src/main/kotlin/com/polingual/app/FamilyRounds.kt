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

@Composable
private fun <T> rememberPolled(lobby: Lobby, fetch: suspend () -> T?): Pair<T?, () -> Unit> {
    var value by remember(lobby.id) { mutableStateOf<T?>(null) }
    var tick by remember { mutableIntStateOf(0) }
    LaunchedEffect(lobby.id, tick) {
        while (true) {
            runCatching { fetch() }.onSuccess { value = it }
            delay(2_000)
        }
    }
    return value to { tick++ }
}

@Composable
internal fun TeachInterlude(graph: Graph, lobby: Lobby) {
    val state by graph.lobbies.state.collectAsState()
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    val (view, refresh) = rememberPolled(lobby) { graph.lobbies.room { t, id -> teach(t, id) } }
    fun act(action: String, extra: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap()) = scope.launch {
        error = null
        try { graph.lobbies.room { t, id -> teachAction(t, id, action, kotlinx.serialization.json.JsonObject(extra)) } } catch (e: BucketError) { error = LobbyErrors.text(e) }
        refresh()
    }
    val me = lobby.me
    Card(Modifier.testTag("teach-round")) {
        Text("Family Teach", style = Type.title, color = PL.Ink)
        Text("A grown-up records a word from home. Everyone guesses what it means.", color = PL.InkDim)
        when {
            lobby.isHost -> TeachHost(lobby, view, ::act)
            view == null -> Text("The host picks a teacher.", color = PL.InkDim)
            me != null && view.speakerId == me.userId -> TeachSpeaker(view, state.card) { lang, clip, rec ->
                act("record", mapOf("lang" to kotlinx.serialization.json.JsonPrimitive(lang), "clip" to kotlinx.serialization.json.JsonPrimitive(clip), "choices" to kotlinx.serialization.json.JsonArray(rec.choices.map { kotlinx.serialization.json.JsonPrimitive(it) }), "answer" to kotlinx.serialization.json.JsonPrimitive(rec.answer)))
            }
            else -> TeachGuess(view) { i -> act("guess", mapOf("guess" to kotlinx.serialization.json.JsonPrimitive(i))) }
        }
        error?.let { Text(it, color = PL.Vermilion) }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TeachHost(lobby: Lobby, view: TeachView?, act: (String, Map<String, kotlinx.serialization.json.JsonElement>) -> Unit) {
    val speaker = lobby.players.firstOrNull { it.userId == view?.speakerId }
    if (view == null || view.status in setOf("done", "skipped", "reported")) {
        if (view?.status == "done") Text("It meant ${view.choices.getOrNull(view.answer ?: 0).orEmpty()}", style = Type.title, color = PL.Ink)
        if (view?.status == "done" && view.teacherAward == true) Pill("Teacher award: ${speaker?.name ?: "the teacher"}", PL.Ochre)
        Text("Pick a grown-up who speaks a home language.", color = PL.InkDim)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            lobby.players.filterNot { it.bot }.forEach { p -> PLPill(p.name) { act("ask", mapOf("speakerId" to kotlinx.serialization.json.JsonPrimitive(p.userId))) } }
        }
        return
    }
    when (view.status) {
        "asked" -> {
            Text("Is an adult holding ${speaker?.name ?: "that"}'s phone?", style = Type.title, color = PL.Ink)
            Text("Tapping yes means you vouch that this speaker is an adult. Signed-in speakers also need an 18 and over account.", color = PL.InkDim)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PLButton("Yes, an adult", Modifier.weight(1f), variant = ButtonVariant.Success, size = ButtonSize.Md) { act("approve", emptyMap()) }
                PLButton("Pick someone else", Modifier.weight(1f), variant = ButtonVariant.Secondary, size = ButtonSize.Md) { act("skip", emptyMap()) }
            }
        }
        "approved" -> Text("${speaker?.name ?: "The teacher"} is recording a word", color = PL.Ink)
        "ready" -> PrimaryButton("Play the word") { act("play", emptyMap()) }
        "open" -> {
            Text("What does it mean?", style = Type.title, color = PL.Ink)
            view.clip?.let { ClipPlayer(it) }
            view.choices.forEach { Text(it, color = PL.Ink) }
            Text("${view.guessed} answered", color = PL.InkDim)
            PrimaryButton("Show the answer") { act("reveal", emptyMap()) }
        }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        PlainLink("Skip this clip") { act("skip", emptyMap()) }
        if (view.status == "ready" || view.status == "open") PlainLink("Report this clip") { act("report", emptyMap()) }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TeachSpeaker(view: TeachView, card: PlayerCard?, send: (String, String, FamilyRules.TeachRecord) -> Unit) {
    val homes = FamilyRules.teacherHomes(card)
    var lang by remember { mutableStateOf(view.lang ?: homes.firstOrNull().orEmpty()) }
    var fields by remember { mutableStateOf(listOf("", "", "")) }
    var answer by remember { mutableIntStateOf(0) }
    var clip by remember { mutableStateOf<String?>(null) }
    when {
        card?.band != SeatBand.Adult -> { Text("Recording is for adults. Pass the phone to a grown-up, or let the host pick another speaker.", color = PL.InkDim); return }
        homes.isEmpty() -> { Text("Mark a first language on your player card to teach a word.", color = PL.InkDim); return }
        view.status == "asked" -> { Text("The host checks that an adult holds this phone.", color = PL.InkDim); return }
        view.status != "approved" -> { Text("Your word is in. Watch the TV.", color = PL.InkDim); return }
    }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) { homes.forEach { l -> PLPill(Lang.name(l), active = lang == l) { lang = l } } }
    ClipRecorder { clip = it }
    clip?.let { ClipPlayer(it) }
    Text("Type what the word means, then two wrong answers. Tap the right one.", color = PL.InkDim)
    fields.forEachIndexed { i, f ->
        OutlinedTextField(f, { v -> fields = fields.toMutableList().also { it[i] = v.take(40) } }, singleLine = true, label = { Text(if (i == answer) "Right answer" else "Wrong answer") }, modifier = Modifier.fillMaxWidth())
        if (i != answer) PlainLink("This one is right") { answer = i }
    }
    val rec = FamilyRules.teachRecord(clip, fields, answer)
    PrimaryButton("Send to the TV", enabled = rec != null && lang.isNotEmpty(), color = PL.Malachite) { rec?.let { r -> clip?.let { send(lang, it, r) } } }
}

@Composable
private fun TeachGuess(view: TeachView, guess: (Int) -> Unit) {
    if (view.status != "open") { Text(if (view.status == "done") "It meant ${view.choices.getOrNull(view.answer ?: 0).orEmpty()}." else "Listen to the TV.", color = PL.InkDim); return }
    view.choices.forEachIndexed { i, c ->
        PLButton(c, variant = if (view.myGuess == i) ButtonVariant.Accent else ButtonVariant.Secondary, size = ButtonSize.Md, enabled = view.myGuess == null) { guess(i) }
    }
}

@Composable
private fun ClipRecorder(onClip: (String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var recording by remember { mutableStateOf(false) }
    var denied by remember { mutableStateOf(false) }
    fun record() = scope.launch {
        val file = java.io.File(context.cacheDir, "teach-clip.m4a")
        @Suppress("DEPRECATION") val rec = if (android.os.Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else MediaRecorder()
        try {
            rec.setAudioSource(MediaRecorder.AudioSource.MIC)
            rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            rec.setAudioEncodingBitRate(64_000)
            rec.setOutputFile(file.absolutePath)
            rec.prepare()
            rec.start()
            recording = true
            delay(FamilyRules.TEACH_CLIP_MS)
            rec.stop()
            onClip(FamilyRules.clipDataUrl(file.readBytes()))
        } catch (e: Exception) {
            denied = true
        } finally {
            rec.release()
            file.delete()
            recording = false
        }
    }
    val launcher = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { ok -> if (ok) record() else denied = true }
    if (denied) Text("The microphone is off. Allow it in Settings to record.", color = PL.Vermilion)
    PrimaryButton(if (recording) "Recording, six seconds" else "Record one word", enabled = !recording) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) record() else launcher.launch(Manifest.permission.RECORD_AUDIO)
    }
}

@Composable
private fun ClipPlayer(dataUrl: String) {
    val context = LocalContext.current
    PLButton("Play the clip", variant = ButtonVariant.Ghost, size = ButtonSize.Md) {
        val bytes = FamilyRules.clipBytes(dataUrl) ?: return@PLButton
        val file = java.io.File(context.cacheDir, "teach-play.m4a").apply { writeBytes(bytes) }
        runCatching {
            MediaPlayer().apply {
                setDataSource(file.absolutePath)
                setOnCompletionListener { it.release(); file.delete() }
                prepare()
                start()
            }
        }
    }
}

@Composable
internal fun TriviaInterlude(graph: Graph, lobby: Lobby) {
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    val (view, refresh) = rememberPolled(lobby) { graph.lobbies.room { t, id -> trivia(t, id) } }
    fun act(action: String, extra: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap()) = scope.launch {
        error = null
        try { graph.lobbies.room { t, id -> triviaAction(t, id, action, kotlinx.serialization.json.JsonObject(extra)) } } catch (e: BucketError) { error = LobbyErrors.text(e) }
        refresh()
    }
    val editing = lobby.isHost && (view == null || view.current < 0)
    Card(Modifier.testTag("trivia-round")) {
        Text("Our Trivia", style = Type.title, color = PL.Ink)
        if (editing) TriviaEditor(view?.questions) { qs -> act("save", mapOf("questions" to graph.api.json.encodeToJsonElement(kotlinx.serialization.builtins.ListSerializer(TriviaQuestion.serializer()), qs))) }
        if (view != null && (!editing || view.count > 0)) TriviaBoard(view, lobby.isHost, ::act)
        if (view == null && !lobby.isHost) Text("The host is writing questions.", color = PL.InkDim)
        error?.let { Text(it, color = PL.Vermilion) }
    }
}

@Composable
private fun TriviaEditor(initial: List<TriviaQuestion>?, save: (List<TriviaQuestion>) -> Unit) {
    var qs by remember(initial) { mutableStateOf(initial?.takeIf { it.isNotEmpty() } ?: listOf(TriviaQuestion("", listOf("", ""), 0))) }
    fun set(i: Int, q: TriviaQuestion) { qs = qs.toMutableList().also { it[i] = q } }
    Text("Write up to ten questions about the family or the year. Tap the right answer for each.", color = PL.InkDim)
    qs.forEachIndexed { i, q ->
        OutlinedTextField(q.prompt, { set(i, q.copy(prompt = it.take(140))) }, label = { Text("Question ${i + 1}") }, modifier = Modifier.fillMaxWidth())
        q.choices.forEachIndexed { k, c ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(c, { v -> set(i, q.copy(choices = q.choices.toMutableList().also { it[k] = v.take(60) })) }, singleLine = true, label = { Text("Answer ${k + 1}") }, modifier = Modifier.weight(1f))
                PLPill(if (q.answer == k) "Right" else "Mark right", active = q.answer == k, small = true) { set(i, q.copy(answer = k)) }
            }
        }
        if (q.choices.size < 4) PlainLink("Add an answer") { set(i, q.copy(choices = q.choices + "")) }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (qs.size < FamilyRules.TRIVIA_MAX) PlainLink("Add a question") { qs = qs + TriviaQuestion("", listOf("", ""), 0) }
        val tidy = qs.map { q -> q.copy(prompt = q.prompt.trim(), choices = q.choices.map { it.trim() }) }
        PrimaryButton("Save ${qs.size} ${if (qs.size == 1) "question" else "questions"}", enabled = FamilyRules.triviaReady(tidy)) { save(tidy) }
    }
}

@Composable
private fun TriviaBoard(view: TriviaView, host: Boolean, act: (String, Map<String, kotlinx.serialization.json.JsonElement>) -> Unit) {
    if (view.current < 0 || view.prompt == null) {
        if (host) PrimaryButton("Start Our Trivia") { act("open", mapOf("index" to kotlinx.serialization.json.JsonPrimitive(0))) }
        else Text("The host is writing questions.", color = PL.InkDim)
        return
    }
    Text("Question ${view.current + 1} of ${view.count}", style = Type.caps, color = PL.InkDim)
    Text(view.prompt.orEmpty(), style = Type.title, color = PL.Ink)
    view.choices.forEachIndexed { i, c ->
        if (host) Text(if (view.answer == i) "Right: $c" else c, color = if (view.answer == i) PL.Malachite else PL.Ink, fontWeight = if (view.answer == i) FontWeight.Bold else FontWeight.Normal)
        else PLButton(c, variant = when { view.answer == i -> ButtonVariant.Success; view.myPick == i -> ButtonVariant.Accent; else -> ButtonVariant.Secondary }, size = ButtonSize.Md, enabled = view.open && view.myPick == null) { act("answer", mapOf("pick" to kotlinx.serialization.json.JsonPrimitive(i))) }
    }
    Text("${view.picked} answered", color = PL.InkDim)
    if (host && view.open) PrimaryButton("Show the answer") { act("reveal", emptyMap()) }
    if (host && !view.open && view.current + 1 < view.count) PrimaryButton("Next question") { act("open", mapOf("index" to kotlinx.serialization.json.JsonPrimitive(view.current + 1))) }
    if (!view.open && view.current + 1 >= view.count) Text("That was the last one", style = Type.title, color = PL.Ink)
}
