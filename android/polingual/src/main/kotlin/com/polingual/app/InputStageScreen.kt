package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.layout.aspectRatio
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.PlayerConstants
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.options.IFramePlayerOptions
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import foundation.bucket.core.engine.ExposureInput
import foundation.bucket.core.engine.InputStage
import foundation.bucket.core.engine.SessionMix
import foundation.bucket.core.engine.StageChoice
import foundation.bucket.core.engine.Viewing
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PrimaryButton
import kotlinx.coroutines.delay

object InputStageCopy {
    const val TITLE = "Before you start"
    const val START = "Start"
    const val DONE = "Done"
    const val SKIP = "Skip"
    const val TAP_HINT = "Tap a word you do not know."
    const val SHOW_MEANING = "Show meaning"
    const val MACHINE = "machine translation"
    const val PLAY = "Play the clip"
    const val PLAY_NOTE = "Loads the video from YouTube"
    const val UNAVAILABLE = "The video did not load. Read along below."
    const val FALLBACK = "No video? Read along below."
    fun rest(n: Int) = if (n == 1) "1 more word to tap while you read." else "$n more words to tap while you read."
}

@Composable
fun InputStageScreen(choice: StageChoice, lang: String, gloss: (String) -> String?, onFinish: (List<ExposureInput>, Double) -> Unit) {
    var phase by remember { mutableStateOf("gloss") }
    if (phase == "gloss") {
        GlossCard(choice, lang, gloss) { phase = "play" }
    } else {
        PlayCard(choice, gloss, onFinish)
    }
}

@Composable
private fun GlossCard(choice: StageChoice, lang: String, gloss: (String) -> String?, start: () -> Unit) {
    val p = LocalPalette.current
    val words = choice.plan.newWords + choice.plan.glossed
    val shown = words.filter { gloss(it) != null }
    Card(Modifier.fillMaxWidth()) {
        Text(InputStageCopy.TITLE, fontSize = 26.sp, color = p.ink)
        shown.forEach { w ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(w, fontSize = 18.sp, color = if (w in choice.plan.newWords) PL.Vermilion else p.ink)
                Text(gloss(w) ?: "", fontSize = 16.sp, color = p.muted)
            }
        }
        if (words.size > shown.size) Text(InputStageCopy.rest(words.size - shown.size), color = p.muted)
        if (words.isEmpty()) Text("You know every word here.", color = p.muted)
        PrimaryButton(InputStageCopy.START, Modifier.fillMaxWidth(), onClick = start)
    }
}

class PlayFlags {
    var resumed by mutableStateOf(true)
    var playing by mutableStateOf(false)
    var unavailable by mutableStateOf(false)
    var lastInput by mutableStateOf(System.currentTimeMillis())
    val visible = mutableStateMapOf<String, Boolean>()
}

@Composable
private fun rememberActivity(choice: StageChoice, view: () -> Viewing, setView: (Viewing) -> Unit, onExit: (Viewing, Boolean) -> Unit): PlayFlags {
    val flags = remember { PlayFlags() }
    val needsPlayer = choice.items.firstOrNull()?.media != null
    val owner = LocalLifecycleOwner.current
    val exit by rememberUpdatedState(onExit)
    DisposableEffect(owner) {
        val obs = LifecycleEventObserver { _, e ->
            if (e == Lifecycle.Event.ON_RESUME) flags.resumed = true
            if (e == Lifecycle.Event.ON_PAUSE) flags.resumed = false
            if (e == Lifecycle.Event.ON_STOP) exit(view(), flags.unavailable)
        }
        owner.lifecycle.addObserver(obs)
        onDispose { owner.lifecycle.removeObserver(obs) }
    }
    LaunchedEffect(choice.unit.id) {
        while (true) {
            delay(1000)
            val idle = System.currentTimeMillis() - flags.lastInput >= SessionMix.IDLE_MS
            val onScreen = flags.visible.filterValues { it }.keys.toList()
            setView(InputStage.present(view(), onScreen))
            if (SessionMix.isActive(flags.resumed, flags.resumed, flags.playing, needsPlayer, idle)) setView(InputStage.addSeen(view(), onScreen, 1000.0))
        }
    }
    return flags
}

@Composable
private fun PlayCard(choice: StageChoice, gloss: (String) -> String?, onFinish: (List<ExposureInput>, Double) -> Unit) {
    val p = LocalPalette.current
    var view by remember { mutableStateOf(Viewing()) }
    val flags = rememberActivity(choice, { view }, { view = it }) { v, unavailable -> onFinish(InputStage.exposureRows(choice, v, completed = false, playerUnavailable = unavailable), v.seenMs.values.sum() / 1000) }
    Card(Modifier.fillMaxWidth().pointerInput(Unit) { awaitPointerEventScope { while (true) { awaitPointerEvent(); flags.lastInput = System.currentTimeMillis() } } }) {
        choice.items.firstOrNull()?.media?.let { m -> InputVideo(m, flags) }
        choice.items.forEach { item ->
            Column(Modifier.onGloballyPositioned { flags.visible[item.id] = visibleShare(it) >= 0.6f }) { SentenceRow(item, view) { view = it } }
        }
        Text(InputStageCopy.TAP_HINT, color = p.muted)
        PrimaryButton(InputStageCopy.DONE, Modifier.fillMaxWidth()) { onFinish(InputStage.exposureRows(choice, view, completed = true, playerUnavailable = flags.unavailable), view.seenMs.values.sum() / 1000) }
        Text(InputStageCopy.SKIP, color = PL.Lapis, modifier = Modifier.padding(8.dp).clickable(role = Role.Button) { onFinish(emptyList(), 0.0) })
    }
}

fun visibleShare(c: LayoutCoordinates): Float {
    val h = c.size.height
    if (h <= 0 || !c.isAttached) return 0f
    return (c.boundsInWindow().height / h).coerceIn(0f, 1f)
}

@Composable
private fun InputVideo(m: foundation.bucket.core.engine.InputMedia, flags: PlayFlags) {
    val p = LocalPalette.current
    var load by remember { mutableStateOf(false) }
    val owner = LocalLifecycleOwner.current
    if (!load || flags.unavailable) {
        Column(Modifier.fillMaxWidth().background(PL.Paper3, RoundedCornerShape(12.dp)).clickable(role = Role.Button) { load = true }.padding(24.dp)) {
            Text(InputStageCopy.PLAY, fontSize = 20.sp, color = p.ink)
            Text(if (flags.unavailable) InputStageCopy.UNAVAILABLE else InputStageCopy.PLAY_NOTE, fontSize = 13.sp, color = p.muted)
        }
    } else {
        AndroidView(
            modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
            factory = { ctx ->
                YouTubePlayerView(ctx).apply {
                    enableAutomaticInitialization = false
                    owner.lifecycle.addObserver(this)
                    val options = IFramePlayerOptions.Builder().controls(1).rel(0).build()
                    initialize(object : AbstractYouTubePlayerListener() {
                        override fun onReady(youTubePlayer: YouTubePlayer) = youTubePlayer.loadVideo(m.videoId, m.start.toFloat())
                        override fun onStateChange(youTubePlayer: YouTubePlayer, state: PlayerConstants.PlayerState) { flags.playing = state == PlayerConstants.PlayerState.PLAYING }
                        override fun onError(youTubePlayer: YouTubePlayer, error: PlayerConstants.PlayerError) { flags.playing = false; flags.unavailable = true }
                    }, options)
                }
            },
            onRelease = { it.release() },
        )
    }
    Text(InputStageCopy.FALLBACK, fontSize = 13.sp, color = p.muted)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SentenceRow(item: foundation.bucket.core.engine.InputItem, view: Viewing, update: (Viewing) -> Unit) {
    val p = LocalPalette.current
    FlowRow(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        item.tokens.forEach { t ->
            val on = t.lemma in view.taps[item.id].orEmpty()
            Text(
                t.surface,
                fontSize = 20.sp,
                color = p.ink,
                modifier = Modifier
                    .defaultMinSize(minHeight = 44.dp)
                    .background(if (on) PL.Ochre else PL.Card, RoundedCornerShape(6.dp))
                    .semantics { contentDescription = t.surface; stateDescription = if (on) "tapped" else "not tapped" }
                    .clickable(role = Role.Button) { update(InputStage.toggleTap(view, item.id, t.lemma)) }
                    .padding(horizontal = 3.dp, vertical = 8.dp),
            )
        }
    }
    item.translation?.let { tr ->
        if (item.id in view.revealed) {
            Text(tr + if (item.translationSource == "machine") "  · " + InputStageCopy.MACHINE else "", fontSize = 14.sp, color = p.muted)
        } else {
            Text(InputStageCopy.SHOW_MEANING, fontSize = 13.sp, color = PL.Lapis, modifier = Modifier.clickable(role = Role.Button) { update(InputStage.reveal(view, item.id)) })
        }
    }
}
