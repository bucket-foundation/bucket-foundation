package com.polingual.app

import foundation.bucket.core.auth.KeyValue
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
        assertEquals(StreakState(6, 0, usedFreeze = true), StreakRules.advance("2026-11-19", 5, 2, "2026-11-22"))
        assertEquals(StreakState(7, 1, usedFreeze = true), StreakRules.advance("2026-11-20", 6, 1, "2026-11-22"))
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

    @Test fun rewardsSpendFreeze() {
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

    @Test fun onboardingStageSurvivesRecreationAndCloses() {
        val kv = MemoryKv()
        Onboard(kv).set(OnboardStage.Lesson)
        val recreated = Onboard(kv)
        assertEquals(OnboardStage.Lesson, recreated.stage.value)
        recreated.paywallClosed()
        assertEquals(OnboardStage.Lesson, Onboard(kv).stage.value)
        recreated.skipLesson()
        recreated.paywallClosed()
        assertEquals(OnboardStage.Done, Onboard(kv).stage.value)
        kv.set(Onboard.KEY, "garbage")
        assertEquals(OnboardStage.Done, Onboard(kv).stage.value)
    }

    @Test fun onboardingNavigatesOnlyWhenNeeded() {
        assertEquals(OnboardNav.LESSON, OnboardNav.target(OnboardStage.Lesson, "today"))
        assertEquals(null, OnboardNav.target(OnboardStage.Lesson, "game/{kind}"))
        assertEquals(OnboardNav.PAYWALL, OnboardNav.target(OnboardStage.Paywall, "today"))
        assertEquals(null, OnboardNav.target(OnboardStage.Paywall, "game/{kind}"))
        assertEquals(null, OnboardNav.target(OnboardStage.Paywall, "paywall"))
        assertEquals(null, OnboardNav.target(OnboardStage.Done, "today"))
    }

    @Test fun widgetModelReadsRewardsState() {
        val kv = MemoryKv()
        var changes = 0
        val r = Rewards(kv, { 9 }) { "2026-11-22" }
        r.onChange = { changes += 1 }
        r.addXp(15)
        assertEquals(1, changes)
        assertEquals(WidgetModel(1, 0, true, 15), WidgetData.read(kv, "2026-11-22"))
        assertEquals(WidgetModel(1, 0, false, 15), WidgetData.read(kv, "2026-11-23"))
        assertEquals(WidgetModel(0, 0, false, 15), WidgetData.read(kv, "2026-11-25"))
    }

    @Test fun widgetReceiverHostsStreakWidget() {
        assertTrue(StreakWidgetReceiver().glanceAppWidget is StreakWidget)
    }

    @Test fun widgetLine() {
        assertEquals(R.string.w_done_today, WidgetData.line(WidgetModel(3, 0, true, 10)))
        assertEquals(R.string.w_keep_it, WidgetData.line(WidgetModel(3, 0, false, 10)))
        assertEquals(R.string.w_start, WidgetData.line(WidgetModel(0, 0, false, 0)))
    }
}
