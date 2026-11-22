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
        val r = Rewards(kv) { "2026-11-22" }
        r.addXp(10)
        r.addXp(15)
        assertEquals(25, r.xp.value)
        assertEquals(25, Rewards(kv) { "2026-11-22" }.xp.value)
    }

    @Test fun streakGrowsOnNextDayAndResetsAfterGap() {
        val kv = MemoryKv()
        var day = "2026-11-20"
        val r = Rewards(kv) { day }
        r.addXp(1)
        r.addXp(1)
        assertEquals(1, r.streak.value)
        day = "2026-11-21"
        r.addXp(1)
        assertEquals(2, r.streak.value)
        day = "2026-11-24"
        r.addXp(1)
        assertEquals(1, r.streak.value)
        assertEquals("2026-11-24", kv.get(Rewards.STREAK_DAY))
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
        val r = Rewards(kv) { "2026-11-22" }
        val c = Combo()
        r.addXp(c.hit())
        r.addXp(c.hit())
        c.miss()
        r.addXp(c.hit())
        assertEquals(35, r.xp.value)
        assertEquals(1, c.streak)
    }

    @Test fun playerHostsAllowOnlyYouTube() {
        assertTrue(PlayerHosts.allows("https://www.youtube.com/embed/x"))
        assertTrue(PlayerHosts.allows("https://i.ytimg.com/vi/x/hq.jpg"))
        assertTrue(PlayerHosts.allows("https://rr1.googlevideo.com/v"))
        assertTrue(PlayerHosts.allows("about:blank"))
        assertFalse(PlayerHosts.allows("https://evil.com/youtube.com"))
        assertFalse(PlayerHosts.allows("https://notyoutube.com/"))
        assertFalse(PlayerHosts.allows("http://www.youtube.com/"))
    }
}
