package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RewardsTest {
    private class MemoryKv : KeyValue {
        val map = mutableMapOf<String, String>()
        override fun get(key: String): String? = map[key]
        override fun set(key: String, value: String?) { if (value == null) map.remove(key) else map[key] = value }
    }

    @Test fun xpAccumulatesAndPersists() {
        val kv = MemoryKv()
        val r = Rewards(kv)
        r.addXp(10)
        r.addXp(15)
        assertEquals(25, r.xp.value)
        assertEquals(25, Rewards(kv).xp.value)
    }

    @Test fun flameUsesSyncedStudyStreakAfterMissedDay() {
        val study = foundation.bucket.core.engine.StudyState(days = listOf("2026-11-19", "2026-11-20", "2026-11-21"))
        assertEquals(3, syncedStreak(study, "2026-11-22"))
        assertEquals(0, syncedStreak(study, "2026-11-23"))
        assertEquals(0, syncedStreak(null, "2026-11-23"))
    }

    @Test fun xpLeavesNoLocalStreakKeys() {
        val kv = MemoryKv()
        Rewards(kv).addXp(10)
        assertEquals(setOf(Rewards.XP), kv.map.keys)
    }

    @Test fun muteTogglesAndPersists() {
        val kv = MemoryKv()
        val r = Rewards(kv)
        assertFalse(r.muted.value)
        r.toggleMute()
        assertTrue(Rewards(kv).muted.value)
    }

    @Test fun comboResetFeedsBaseXp() {
        val kv = MemoryKv()
        val r = Rewards(kv)
        val c = Combo()
        r.addXp(c.hit())
        r.addXp(c.hit())
        c.miss()
        r.addXp(c.hit())
        assertEquals(35, r.xp.value)
        assertEquals(1, c.streak)
    }

}
