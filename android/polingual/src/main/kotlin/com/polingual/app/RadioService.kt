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

class Radio(private val context: Context) {
    private var controller: MediaController? = null
    private val _now = MutableStateFlow(NowPlaying())
    val now: StateFlow<NowPlaying> = _now

    private suspend fun connect(): MediaController {
        controller?.let { return it }
        val token = SessionToken(context, ComponentName(context, RadioService::class.java))
        val future = MediaController.Builder(context, token).buildAsync()
        val c = suspendCancellableCoroutine { cont -> future.addListener({ cont.resume(future.get()) }, MoreExecutors.directExecutor()) }
        c.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) { _now.value = _now.value.copy(playing = isPlaying, error = null) }
            override fun onPlaybackStateChanged(state: Int) { _now.value = _now.value.copy(buffering = state == Player.STATE_BUFFERING) }
            override fun onPlayerError(error: androidx.media3.common.PlaybackException) { _now.value = _now.value.copy(playing = false, buffering = false, error = "This station stopped. Pick another.") }
        })
        controller = c
        return c
    }

    suspend fun play(station: RadioStation) {
        val url = station.stream ?: return
        val c = connect()
        if (_now.value.station?.stationuuid == station.stationuuid && c.mediaItemCount > 0) {
            if (c.isPlaying) c.pause() else c.play()
            return
        }
        val item = MediaItem.Builder().setMediaId(station.stationuuid).setUri(url.toUri())
            .setMediaMetadata(MediaMetadata.Builder().setTitle(station.name).setArtist(station.country).setIsPlayable(true).setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION).build())
            .build()
        _now.value = NowPlaying(station, playing = false, buffering = true)
        c.setMediaItem(item)
        c.prepare()
        c.play()
    }

    suspend fun pause() { connect().pause() }
}
