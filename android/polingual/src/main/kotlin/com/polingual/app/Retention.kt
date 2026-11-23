package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.time.LocalDate

enum class OnboardStage { Done, Lesson, Paywall }

class Onboard(private val kv: KeyValue) {
    private val _stage = MutableStateFlow(runCatching { OnboardStage.valueOf(kv.get(KEY) ?: "") }.getOrDefault(OnboardStage.Done))
    val stage: StateFlow<OnboardStage> = _stage

    fun set(s: OnboardStage) {
        _stage.value = s
        kv.set(KEY, s.name)
    }

    fun lessonFinished() { if (_stage.value == OnboardStage.Lesson) set(OnboardStage.Paywall) }

    fun skipLesson() = lessonFinished()

    fun paywallClosed() { if (_stage.value == OnboardStage.Paywall) set(OnboardStage.Done) }

    companion object { const val KEY = "onboard.stage" }
}

object OnboardNav {
    const val LESSON = "game/daily"
    const val PAYWALL = "paywall"

    fun target(stage: OnboardStage, current: String?): String? = when (stage) {
        OnboardStage.Lesson -> LESSON.takeIf { current != "game/{kind}" && current != LESSON }
        OnboardStage.Paywall -> PAYWALL.takeIf { current != PAYWALL && current != "game/{kind}" }
        OnboardStage.Done -> null
    }
}

data class StreakState(val count: Int, val freezes: Int, val usedFreeze: Boolean = false)

object StreakRules {
    const val MAX_FREEZES = 2
    const val EARN_EVERY = 7

    fun advance(lastDay: String?, count: Int, freezes: Int, today: String): StreakState {
        if (lastDay == today) return StreakState(count.coerceAtLeast(1), freezes)
        val t = runCatching { LocalDate.parse(today) }.getOrNull() ?: return StreakState(1, freezes)
        val last = lastDay?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
        val gap = last?.let { java.time.temporal.ChronoUnit.DAYS.between(it, t) } ?: Long.MAX_VALUE
        val (next, left, used) = when {
            gap == 1L -> Triple(count + 1, freezes, false)
            gap >= 2L && gap - 1 <= freezes && count > 0 -> Triple(count + 1, freezes - (gap - 1).toInt(), true)
            else -> Triple(1, freezes, false)
        }
        val earned = if (next % EARN_EVERY == 0) 1 else 0
        return StreakState(next, (left + earned).coerceAtMost(MAX_FREEZES), used)
    }

    fun alive(lastDay: String?, count: Int, freezes: Int, today: String): Int {
        val t = runCatching { LocalDate.parse(today) }.getOrNull() ?: return 0
        val last = lastDay?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: return 0
        val gap = java.time.temporal.ChronoUnit.DAYS.between(last, t)
        return if (gap <= 1 || gap - 1 <= freezes) count else 0
    }
}
