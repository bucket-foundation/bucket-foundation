package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class Ci14EngineTest {
    private val row = LogRow.VocabTest("v1", 1_000L, "d-1", "UTC", "sys", "es", "baseline", "A", null, 40, 50, 2, 20, 5123.4, 0, 180)

    @Test fun vocabTestRowRoundTrips() {
        assertEquals(row, ReviewLog.parse(ReviewLog.encodeRow(row)))
        val armed = row.copy(phase = "day28", form = "B", arm = "s70", day = 29)
        assertEquals(armed, ReviewLog.parse(ReviewLog.encodeRow(armed)))
    }

    @Test fun vocabTestRowRejectsBadValues() {
        assertNull(ReviewLog.parse(ReviewLog.encodeRow(row.copy(hits = 51))))
        assertNull(ReviewLog.parse(ReviewLog.encodeRow(row.copy(phase = "day7"))))
        assertNull(ReviewLog.parse(ReviewLog.encodeRow(row.copy(form = "C"))))
    }

    @Test fun sessionRowRoundTrips() {
        val s = LogRow.Session("s1", 2_000L, "d-1", "UTC", "sys", "es", "sess", 1_000L, 2_000L, 0.7, 0.5, "s70", 2, 10)
        assertEquals(s, ReviewLog.parse(ReviewLog.encodeRow(s)))
    }

    @Test fun takeCapsVocabTests() {
        val rows = (1..6).map { row.copy(id = "v$it", at = it.toLong()) }
        assertEquals(ReviewLog.VOCAB_TEST_CAP, ReviewLog.take(rows).size)
    }

    private fun item(id: String, kind: ItemKind, es: String) = LangItem(id, kind, 1.0, 1, "c", "g", mapOf("es" to es, "en" to id), emptyMap(), null, emptyList(), null, emptyMap())

    @Test fun heldOutWordsLeaveTheCardCorpus() {
        val corpus = LangCorpus(listOf(item("a", ItemKind.Word, "Casa"), item("b", ItemKind.Word, "perro"), item("c", ItemKind.Phrase, "casa")), "x")
        val forms = mapOf("A" to listOf(YesNoTest.TestItem("casa", true, 0), YesNoTest.TestItem("perro", false, null)), "B" to emptyList())
        val held = InputExperiment.heldOutWords(forms)
        assertEquals(setOf("casa"), held)
        assertEquals(listOf("b", "c"), InputExperiment.withoutHeldOut(corpus, mapOf("es" to held)).items.map { it.id })
        assertEquals(3, InputExperiment.withoutHeldOut(corpus, emptyMap()).items.size)
    }

    @Test fun formsParse() {
        val f = YesNoTest.parseForms("""{"forms":{"A":[{"word":"zel","real":false,"band":null}],"B":[{"word":"casa","real":true,"band":0}]}}""")
        assertEquals(YesNoTest.TestItem("casa", true, 0), f?.get("B")?.single())
        assertNull(YesNoTest.parseForms("""{"forms":{"A":[]}}"""))
    }
}
