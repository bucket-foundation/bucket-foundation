package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ListenInputTest {
    private val t0 = 1_795_683_600_000L
    private val know: (String) -> Double = { if (it == "zz") 0.0 else 1.0 }
    private fun caption(id: String, lemmas: List<String>, kind: String = "audio") = InputItem(id, kind, lemmas.map { InputToken(it, it) }, lemmas.joinToString(" "), null, null, null)
    private fun metric(e: ExposureInput) = MetricRow("exposure", "es", t0.toDouble(), null, e.seconds.toDouble(), e.coveragePred)

    @Test fun radioWithoutCaptionsLogsTimeAndCountsNone() {
        val rows = ListenInput.radioExposures("9617a958-0601-11e8-ae97-52543be04c81", t0, 600_000.0, know)
        assertEquals(listOf(600), rows.map { it.seconds })
        assertEquals(0.0, rows[0].coveragePred)
        assertTrue(rows[0].lemmasSeen.isEmpty())
        assertEquals(0.0, ProgressMetric.inputSeconds(rows.map(::metric), "es"))
    }

    @Test fun captionedRadioCountsAtNinetyPercent() {
        val high = ListenInput.radioExposures("st", t0, 120_000.0, know, listOf(caption("c1", (0 until 19).map { "w$it" } + "zz")))
        assertEquals(0.95, high[0].coveragePred)
        assertTrue(ProgressMetric.countsAsInput(metric(high[0]), "es"))
        val low = ListenInput.radioExposures("st", t0, 120_000.0, know, listOf(caption("c2", listOf("a", "zz"))))
        assertEquals(0.5, low[0].coveragePred)
        assertEquals(0.0, ProgressMetric.inputSeconds(low.map(::metric), "es"))
    }

    @Test fun longListeningSplitsAtTheEventCap() {
        val rows = ListenInput.radioExposures("st", t0, 2.5 * 3_600_000, know)
        assertEquals(listOf(3600, 3600, 1800), rows.map { it.seconds })
        assertEquals(3, rows.map { it.item }.toSet().size)
        assertTrue(ListenInput.radioExposures("st", t0, 400.0, know).isEmpty())
    }

    @Test fun oddStationIdsMakeTheSameKeysAsWeb() {
        val r = ListenInput.radioExposures("a b/c?d", t0, 60_000.0, know)[0]
        assertEquals("radio:a-b/c-d", r.unit)
        assertEquals("radio:a-b/c-d:${t0 / 1000}.0", r.item)
    }

    @Test fun clipCountsByItsCoverageAndSkipsNonAudio() {
        val clip = caption("clip-1", (0 until 10).map { "w$it" })
        val row = ListenInput.clipExposure(clip, 45_400.0, true, know)!!
        assertEquals(45, row.seconds)
        assertEquals(1.0, row.coveragePred)
        assertTrue(row.completed)
        assertNull(ListenInput.clipExposure(caption("s", listOf("a"), "sentence"), 10_000.0, true, know))
        assertNull(ListenInput.clipExposure(clip, 0.0, true, know))
    }

    @Test fun audioCoverageClamps() {
        assertEquals(0.0, ListenInput.audioCoverage(emptyList(), know))
        assertEquals(0.5, ListenInput.audioCoverage(listOf("a", "b", "zz", "zz")) { when (it) { "a" -> 2.0; "b" -> 1.0; else -> -1.0 } })
    }

    @Test fun radioRowsRoundTripThroughTheLog() {
        val e = ListenInput.radioExposures("st", t0, 90_000.0, know)[0]
        val row = InputStage.logRow(e, "es", "0b6a3f0e-5f7d-4d3e-9a51-1f4c2b7d9e10", t0, "dev", "UTC", "sys-1")
        assertEquals(row, ReviewLog.parse(ReviewLog.encode(row)))
    }
}
