package com.polingual.app

import android.media.AudioManager
import android.media.ToneGenerator
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.math.cos
import kotlin.math.sin

class Rewards(private val kv: KeyValue) {
    private val _muted = MutableStateFlow(kv.get(MUTE) == "1")
    val muted: StateFlow<Boolean> = _muted
    private val _streak = MutableStateFlow(kv.get(STREAK)?.toIntOrNull() ?: 0)
    val streak: StateFlow<Int> = _streak
    private val _xp = MutableStateFlow(kv.get(XP)?.toIntOrNull() ?: 0)
    val xp: StateFlow<Int> = _xp
    private val tones = runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 60) }.getOrNull()

    fun toggleMute() {
        _muted.value = !_muted.value
        kv.set(MUTE, if (_muted.value) "1" else "0")
    }

    fun addXp(gain: Int) {
        _xp.value += gain
        kv.set(XP, _xp.value.toString())
        val day = today()
        val next = DayStreak.next(kv.get(STREAK_DAY), _streak.value, day)
        _streak.value = next
        kv.set(STREAK, next.toString())
        kv.set(STREAK_DAY, day)
    }

    fun correct(view: View, combo: Int) {
        view.performHapticFeedback(if (combo >= 3) HapticFeedbackConstants.LONG_PRESS else HapticFeedbackConstants.CONFIRM)
        tone(if (combo >= 3) ToneGenerator.TONE_PROP_ACK else ToneGenerator.TONE_PROP_BEEP, 90)
    }

    fun wrong(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.REJECT)
        tone(ToneGenerator.TONE_PROP_NACK, 120)
    }

    fun finish(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        tone(ToneGenerator.TONE_PROP_ACK, 200)
    }

    fun tap(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        tone(ToneGenerator.TONE_PROP_BEEP2, 60)
    }

    private fun tone(kind: Int, ms: Int) {
        if (!_muted.value) runCatching { tones?.startTone(kind, ms) }
    }

    companion object {
        const val MUTE = "fx.muted"
        const val STREAK = "fx.streak"
        const val STREAK_DAY = "fx.streakDay"
        const val XP = "fx.xp"
    }
}

@Composable
fun RewardBar(rewards: Rewards, combo: Int = 0) {
    val streak by rewards.streak.collectAsState()
    val xp by rewards.xp.collectAsState()
    val muted by rewards.muted.collectAsState()
    val p = LocalPalette.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        val flame = remember { Animatable(1f) }
        LaunchedEffect(streak) { flame.snapTo(1.4f); flame.animateTo(1f, tween(400)) }
        Icon(Icons.Filled.LocalFireDepartment, contentDescription = "Day streak", tint = if (streak > 0) D8.vermilion else p.muted, modifier = Modifier.scale(flame.value))
        Text("$streak", style = Type.title.copy(fontSize = 16.sp()), color = p.ink)
        Text("$xp XP", color = p.muted)
        Box(Modifier.weight(1f))
        if (combo >= 2) ComboBadge(combo)
        Icon(
            if (muted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
            contentDescription = if (muted) "Sound off" else "Sound on",
            tint = p.muted,
            modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { rewards.toggleMute() }.padding(4.dp),
        )
    }
}

@Composable
fun ComboBadge(combo: Int) {
    val pop = remember { Animatable(1f) }
    LaunchedEffect(combo) { pop.snapTo(1.35f); pop.animateTo(1f, tween(250)) }
    Text(
        "x$combo combo",
        style = Type.title.copy(fontSize = 14.sp()),
        color = D8.parchment,
        modifier = Modifier.scale(pop.value).clip(RoundedCornerShape(10.dp)).background(if (combo >= 5) D8.vermilion else D8.malachite).padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
fun XpPop(gain: Int, key: Int) {
    if (gain <= 0) return
    val t = remember(key) { Animatable(0f) }
    LaunchedEffect(key) { t.animateTo(1f, tween(800)) }
    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Text(
            "+$gain XP",
            style = Type.title.copy(fontSize = 22.sp()),
            color = D8.malachite,
            modifier = Modifier.offset(y = (-36 * t.value).dp).scale(1f + 0.3f * (1 - t.value)).alpha(1f - t.value),
        )
    }
}

@Composable
fun Confetti(key: Any = Unit) {
    val t = remember(key) { Animatable(0f) }
    LaunchedEffect(key) { t.animateTo(1f, tween(1800, easing = LinearEasing)) }
    val pieces = remember(key) {
        val rng = java.util.Random(key.hashCode().toLong())
        List(70) { Triple(rng.nextFloat(), rng.nextFloat() * 6.28f, rng.nextFloat()) }
    }
    val colors = listOf(D8.vermilion, D8.malachite, D8.lapis, Color(0xFFD9B45A))
    if (t.value >= 1f) return
    Canvas(Modifier.fillMaxSize()) {
        pieces.forEachIndexed { i, (x, angle, speed) ->
            val fall = t.value * size.height * (0.6f + speed)
            val sway = sin(angle + t.value * 8f) * 24f
            val px = x * size.width + sway
            val py = -20f + fall
            val r = 6f + 4f * cos(angle)
            drawRect(colors[i % colors.size].copy(alpha = 1f - t.value * 0.6f), topLeft = Offset(px, py), size = Size(r * 1.6f, r))
        }
    }
}

@Composable
fun rememberHost(): View = LocalView.current
