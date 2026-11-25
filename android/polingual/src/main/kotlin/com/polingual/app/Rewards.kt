package com.polingual.app

import android.media.AudioManager
import android.media.ToneGenerator
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.ui.pl.Glyph
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLMotion
import foundation.bucket.core.ui.pl.PLRadius
import foundation.bucket.core.ui.pl.StreakFlame
import foundation.bucket.core.ui.pl.plSurface
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import foundation.bucket.core.engine.Streak
import foundation.bucket.core.engine.StudyState

class Combo {
    var streak = 0
        private set
    var best = 0
        private set

    fun hit(): Int {
        streak += 1
        best = maxOf(best, streak)
        return BASE_XP + minOf(streak - 1, 4) * BONUS_XP
    }

    fun miss() { streak = 0 }

    companion object {
        const val BASE_XP = 10
        const val BONUS_XP = 5
    }
}

class Rewards(private val kv: KeyValue) {
    private val _muted = MutableStateFlow(kv.get(MUTE) == "1")
    val muted: StateFlow<Boolean> = _muted
    private val _xp = MutableStateFlow(kv.get(XP)?.toIntOrNull() ?: 0)
    val xp: StateFlow<Int> = _xp
    private var tones: ToneGenerator? = null

    fun toggleMute() {
        _muted.value = !_muted.value
        kv.set(MUTE, if (_muted.value) "1" else "0")
    }

    fun addXp(gain: Int) {
        _xp.value += gain
        kv.set(XP, _xp.value.toString())
    }

    fun correct(view: View, combo: Int) {
        view.performHapticFeedback(if (combo >= 3) HapticFeedbackConstants.LONG_PRESS else HapticFeedbackConstants.CONFIRM)
        tone(if (combo >= 3) ToneGenerator.TONE_PROP_ACK else ToneGenerator.TONE_PROP_BEEP, 90)
    }

    fun wrong(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.REJECT)
        tone(ToneGenerator.TONE_PROP_NACK, 120)
    }

    private fun tone(kind: Int, ms: Int) {
        if (_muted.value) return
        runCatching { (tones ?: ToneGenerator(AudioManager.STREAM_MUSIC, 60).also { tones = it }).startTone(kind, ms) }
    }

    fun release() {
        tones?.release()
        tones = null
    }

    companion object {
        const val MUTE = "fx.muted"
        const val XP = "fx.xp"
    }
}

private val popEase = CubicBezierEasing(PLMotion.ease[0], PLMotion.ease[1], PLMotion.ease[2], PLMotion.ease[3])

@Composable
fun RewardBar(rewards: Rewards, streak: Int, combo: Int = 0) {
    val xp by rewards.xp.collectAsState()
    val muted by rewards.muted.collectAsState()
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        StreakFlame(streak)
        Text(stringResource(R.string.d_x_xp, xp), style = Type.small, color = PL.InkDim)
        Box(Modifier.weight(1f))
        if (combo >= 2) ComboBadge(combo)
        Box(
            Modifier.size(40.dp).clickable(onClickLabel = stringResource(if (muted) R.string.d_sound_off else R.string.d_sound_on)) { rewards.toggleMute() },
            contentAlignment = Alignment.Center,
        ) { Glyph("speaker", stringResource(if (muted) R.string.d_sound_off else R.string.d_sound_on), PL.InkDim, Modifier.size(22.dp).alpha(if (muted) 0.4f else 1f)) }
    }
}

@Composable
fun ComboBadge(combo: Int) {
    val pop = remember { Animatable(1f) }
    LaunchedEffect(combo) { pop.snapTo(1.25f); pop.animateTo(1f, tween(PLMotion.pop, easing = popEase)) }
    Text(
        stringResource(R.string.d_x_combo, combo), style = Type.caps, color = PL.Paper,
        modifier = Modifier.scale(pop.value).plSurface(if (combo >= 5) PL.Vermilion else PL.Malachite, PLRadius.pill).padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

fun syncedStreak(study: StudyState?, day: String = today()): Int = Streak.count(study?.days.orEmpty(), day)

@Composable
fun rememberSyncedStreak(graph: Graph): Int {
    val app by graph.state.collectAsState()
    val system = app?.system
    return syncedStreak(system?.let { app?.study?.get(it.id) })
}
