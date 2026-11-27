package com.polingual.app

import android.content.ComponentName
import android.content.Context
import androidx.core.net.toUri
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaController
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.MoreExecutors
import foundation.bucket.core.net.RadioStation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class RadioService : MediaSessionService() {
    private var session: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val player = ExoPlayer.Builder(this)
            .setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()
        session = MediaSession.Builder(this, player).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    override fun onTaskRemoved(rootIntent: android.content.Intent?) {
        val player = session?.player
        if (player == null || !player.playWhenReady || player.mediaItemCount == 0) stopSelf()
    }

    override fun onDestroy() {
        session?.run { player.release(); release() }
        session = null
        super.onDestroy()
    }
}

data class NowPlaying(val station: RadioStation? = null, val playing: Boolean = false, val buffering: Boolean = false, val error: String? = null)

data class Heard(val stationId: String, val lang: String, val startedAt: Long, val ms: Long)

data class Listening(val stationId: String, val lang: String, val startedAt: Long, val since: Long?, val ms: Long) {
    fun settle(now: Long): Listening = if (since == null) this else copy(ms = ms + maxOf(0L, now - since), since = null)
    fun heard(): Heard? = if (ms >= 1000) Heard(stationId, lang, startedAt, ms) else null

    fun checkpoint(now: Long): Pair<Heard?, Listening> {
        val s = settle(now)
        return s.heard() to s.copy(startedAt = now, ms = 0, since = if (since == null) null else now)
    }

    companion object {
        const val CHECKPOINT_MS = 300_000L
    }
}

class Radio(private val context: Context, private val clock: () -> Long = System::currentTimeMillis, private val onHeard: (Heard) -> Unit = {}) {
    private var controller: MediaController? = null
    private var listening: Listening? = null
    private val ticker = android.os.Handler(android.os.Looper.getMainLooper())
    private val tick = object : Runnable {
        override fun run() {
            listening?.let { l ->
                val (h, next) = l.checkpoint(clock())
                h?.let(onHeard)
                listening = next
            }
            ticker.postDelayed(this, Listening.CHECKPOINT_MS)
        }
    }

    private fun close(keep: Boolean) {
        val now = clock()
        val l = listening?.settle(now)
        l?.heard()?.let(onHeard)
        listening = if (keep && l != null) l.copy(startedAt = now, ms = 0) else null
    }
    private val _now = MutableStateFlow(NowPlaying())
    val now: StateFlow<NowPlaying> = _now

    private suspend fun connect(): MediaController {
        controller?.let { return it }
        val token = SessionToken(context, ComponentName(context, RadioService::class.java))
        val future = MediaController.Builder(context, token)
            .setListener(object : MediaController.Listener {
                override fun onDisconnected(controller: MediaController) { release() }
            })
            .buildAsync()
        val c = suspendCancellableCoroutine { cont -> future.addListener({ cont.resume(future.get()) }, MoreExecutors.directExecutor()) }
        c.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                ticker.removeCallbacks(tick)
                if (isPlaying) {
                    listening = listening?.let { if (it.since == null) it.copy(since = clock()) else it }
                    ticker.postDelayed(tick, Listening.CHECKPOINT_MS)
                } else close(keep = true)
                _now.value = _now.value.copy(playing = isPlaying, error = null)
            }
            override fun onPlaybackStateChanged(state: Int) { _now.value = _now.value.copy(buffering = state == Player.STATE_BUFFERING) }
            override fun onPlayerError(error: androidx.media3.common.PlaybackException) { _now.value = _now.value.copy(playing = false, buffering = false, error = "This station stopped. Pick another.") }
        })
        controller = c
        return c
    }

    suspend fun play(station: RadioStation, lang: String) {
        val url = station.stream ?: return
        val c = connect()
        if (_now.value.station?.stationuuid == station.stationuuid && c.mediaItemCount > 0) {
            if (c.isPlaying) c.pause() else c.play()
            return
        }
        val item = MediaItem.Builder().setMediaId(station.stationuuid).setUri(url.toUri())
            .setMediaMetadata(MediaMetadata.Builder().setTitle(station.name).setArtist(station.country).setIsPlayable(true).setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION).build())
            .build()
        close(keep = false)
        listening = Listening(station.stationuuid, lang, clock(), null, 0)
        _now.value = NowPlaying(station, playing = false, buffering = true)
        c.setMediaItem(item)
        c.prepare()
        c.play()
    }

    suspend fun pause() { connect().pause() }

    fun release() {
        ticker.removeCallbacks(tick)
        close(keep = false)
        controller = null
        _now.value = NowPlaying()
    }
}
