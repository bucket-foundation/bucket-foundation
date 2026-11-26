package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.engine.ProgressMetric
import foundation.bucket.core.engine.MetricRow
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RadioLogTest {
    private class MemKv : KeyValue {
        val m = mutableMapOf<String, String>()
        override fun get(key: String) = m[key]
        override fun set(key: String, value: String?) { if (value == null) m.remove(key) else m[key] = value }
    }

    private var n = 0
    private val ids = { "00000000-0000-4000-8000-%012d".format(++n) }

    @Test fun heardRadioIsLoggedAndNotCounted() {
        val log = RadioLog(MemKv())
        log.log(Heard("st-1", "es", 1_000_000L, 4_000_000L), "sys", "dev", "UTC", 5_000_000L, ids)
        val rows = log.rows()
        assertEquals(listOf(3600, 400), rows.map { it.seconds })
        assertEquals(listOf("sys"), rows.map { it.systemId }.distinct())
        val metric = rows.map { MetricRow("exposure", it.lang, it.at.toDouble(), it.tz, it.seconds.toDouble(), it.coveragePred) }
        assertEquals(0.0, ProgressMetric.inputSeconds(metric, "es"))
    }

    @Test fun logKeepsTheNewestRowsUnderTheCap() {
        val log = RadioLog(MemKv(), cap = 3)
        repeat(5) { log.log(Heard("st-$it", "es", it * 1000L, 60_000L), "sys", "dev", "UTC", it * 1000L, ids) }
        assertEquals(listOf("radio:st-2", "radio:st-3", "radio:st-4"), log.rows().map { it.unit })
    }

    @Test fun listeningSettlesOnceAndSkipsShortSpans() {
        val open = Listening("st", "es", 1_000, since = 5_000, ms = 2_000)
        val s = open.settle(65_000)
        assertEquals(62_000, s.ms)
        assertEquals(s, s.settle(99_000))
        assertEquals(10, Listening("st", "es", 0, since = 9_000, ms = 10).settle(8_000).ms)
        assertNull(Listening("st", "es", 0, null, 999).heard())
        assertEquals(Heard("st", "es", 0, 1_000), Listening("st", "es", 0, null, 1_000).heard())
    }
}
