package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import java.time.Duration
import java.time.LocalDateTime
import java.util.Locale
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class RetentionTest {
    private class MemoryKv : KeyValue {
        val map = mutableMapOf<String, String>()
        override fun get(key: String): String? = map[key]
        override fun set(key: String, value: String?) { if (value == null) map.remove(key) else map[key] = value }
    }

    @Test fun freezeCoversOneMissedDay() {
        assertEquals(StreakState(6, 0, usedFreeze = true), StreakRules.advance("2026-11-20", 5, 1, "2026-11-22"))
        assertEquals(StreakState(1, 1), StreakRules.advance("2026-11-19", 5, 1, "2026-11-22"))
        assertEquals(StreakState(6, 0, usedFreeze = true), StreakRules.advance("2026-11-19", 5, 2, "2026-11-22").copy(freezes = 0))
    }

    @Test fun freezeEarnedEverySeventhDayAndCapped() {
        assertEquals(StreakState(7, 1), StreakRules.advance("2026-11-21", 6, 0, "2026-11-22"))
        assertEquals(StreakState(14, 2), StreakRules.advance("2026-11-21", 13, 2, "2026-11-22"))
        assertEquals(StreakState(3, 0), StreakRules.advance("2026-11-22", 3, 0, "2026-11-22"))
    }

    @Test fun aliveStreakHonoursFreezes() {
        assertEquals(4, StreakRules.alive("2026-11-21", 4, 0, "2026-11-22"))
        assertEquals(4, StreakRules.alive("2026-11-20", 4, 1, "2026-11-22"))
        assertEquals(0, StreakRules.alive("2026-11-20", 4, 0, "2026-11-22"))
        assertEquals(0, StreakRules.alive(null, 4, 2, "2026-11-22"))
    }

    @Test fun rewardsSpendFreezeAndRecordHabit() {
        val kv = MemoryKv()
        var day = "2026-11-15"
        val r = Rewards(kv, { 8 }) { day }
        for (d in 15..21) { day = "2026-11-$d"; r.addXp(1) }
        assertEquals(7, r.streak.value)
        assertEquals(1, r.freezes.value)
        day = "2026-11-23"
        r.addXp(1)
        assertEquals(8, r.streak.value)
        assertEquals(0, r.freezes.value)
        assertEquals(8, Habit.usualHour(kv))
    }

    @Test fun usualHourPicksMostCommon() {
        assertEquals(20, Habit.usualHour(listOf(8, 20, 20, 21)))
        assertEquals(Habit.DEFAULT_HOUR, Habit.usualHour(emptyList()))
        assertEquals(7, Habit.usualHour(listOf(7, 9)))
    }

    @Test fun reminderDelayIsNextOccurrence() {
        val now = LocalDateTime.of(2026, 11, 22, 18, 30)
        assertEquals(Duration.ofMinutes(30), Habit.delayUntil(now, 19))
        assertEquals(Duration.ofHours(23).plusMinutes(30), Habit.delayUntil(now, 18))
    }

    @Test fun onboardingGoesLessonThenPaywall() {
        val kv = MemoryKv()
        val o = Onboard(kv)
        assertEquals(OnboardStage.Done, o.stage.value)
        o.lessonFinished()
        assertEquals(OnboardStage.Done, o.stage.value)
        o.set(OnboardStage.Lesson)
        o.lessonFinished()
        assertEquals(OnboardStage.Paywall, Onboard(kv).stage.value)
    }

    @Test fun yearlyPricePerMonth() {
        assertEquals("$4.17", PlanMath.perMonth(49_990_000, "USD", Locale.US))
        assertTrue(Plan.TRIAL_DAYS >= 7)
    }

    @Test fun widgetLine() {
        assertEquals("Done for today", WidgetData.line(WidgetModel(3, 0, true, 10)))
        assertEquals("Play to keep it", WidgetData.line(WidgetModel(3, 0, false, 10)))
        assertEquals("Start a streak", WidgetData.line(WidgetModel(0, 0, false, 0)))
    }
}
