package com.polingual.app

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.model.LangSystem
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class PlacementTest {
    private fun ans(band: CefrBand, right: Int, wrong: Int, recall: Boolean = true): List<CefrAnswer> =
        List(right) { CefrAnswer(band, if (recall && it == 0) CefrTask.Recall else CefrTask.Recognize, "${band.label}r$it", true) } +
            List(wrong) { CefrAnswer(band, CefrTask.Recognize, "${band.label}w$it", false) }

    @Test
    fun wilsonMatchesIos() {
        assertEquals(0.0, Cefr.wilsonLower(0, 0))
        assertEquals(0.41, Cefr.wilsonLower(6, 8))
        assertEquals(0.68, Cefr.wilsonLower(8, 8))
    }

    @Test
    fun passNeedsSixRightAndOneRecall() {
        assertTrue(Cefr.bandResult(CefrBand.A1, ans(CefrBand.A1, 6, 0)).passed)
        val noRecall = Cefr.bandResult(CefrBand.A1, ans(CefrBand.A1, 6, 2, recall = false))
        assertFalse(noRecall.passed)
        assertTrue(noRecall.failed)
        assertTrue(Cefr.bandResult(CefrBand.A1, ans(CefrBand.A1, 1, 3)).failed)
    }

    @Test
    fun stepWalksBandsAndStopsAtFirstFail() {
        val first = Cefr.step(emptyList())
        assertEquals(CefrBand.A1 to CefrTask.Recognize, first.next)
        val s = Cefr.step(ans(CefrBand.A1, 6, 0) + ans(CefrBand.A2, 0, 3))
        assertTrue(s.done)
        assertEquals("A1", s.level)
        val gap = Cefr.step(ans(CefrBand.A1, 6, 0), available = listOf(CefrBand.A1))
        assertEquals(CefrBand.A2, gap.unknownFrom)
    }

    @Test
    fun placementNeedsTwoBandsAndSkipFloor() {
        val one = Cefr.step(ans(CefrBand.A1, 6, 0) + ans(CefrBand.A2, 0, 3))
        assertTrue(Cefr.placement("es", ans(CefrBand.A1, 6, 0), one).placeIds.isEmpty())
        val all = ans(CefrBand.A1, 8, 0) + ans(CefrBand.A2, 8, 0) + ans(CefrBand.B1, 8, 0) + ans(CefrBand.B2, 0, 3)
        val p = Cefr.placement("es", all, Cefr.step(all))
        assertEquals("B1", p.level)
        assertEquals(4.0, p.floorTier)
        assertEquals("band B1", Cefr.placement("la", all, Cefr.step(all)).label)
    }

    private fun item(id: String, tier: Double) = LangItem(id, ItemKind.Word, tier, 1, "food", id, mapOf("en" to "en-$id", "es" to "es-$id"), emptyMap(), null, emptyList(), null, emptyMap())

    @Test
    fun questionsFallBackToWordTasks() {
        val corpus = LangCorpus((1..12).map { item("a$it", 1.0) }, "")
        val sys = LangSystem("s", "n", "en", listOf("es"), 0.0, 0.0)
        val rng = SeededRandom(7uL)
        val (task, q) = assertNotNull(Cefr.question(CefrBand.A1, CefrTask.Grammar, sys, corpus, "es", emptySet(), rng))
        assertEquals(CefrTask.Recall, task)
        assertEquals(QuestionKind.Translate, q.kind)
        assertTrue(q.check("ES-" + q.itemId))
        val (lt, lq) = Cefr.question(CefrBand.A1, CefrTask.Listen, sys, corpus, "es", emptySet(), rng, speech = false)!!
        assertEquals(CefrTask.Recall, lt)
        val choose = Cefr.question(CefrBand.A1, CefrTask.Recognize, sys, corpus, "es", setOf(lq.itemId), rng)!!.second
        assertEquals(4, choose.options.size)
        assertTrue(choose.answer in choose.options)
        assertEquals(listOf(CefrBand.A1), Cefr.available(sys, corpus, "es"))
    }

    @Test
    fun applyMarksWordsKnown() {
        val corpus = LangCorpus(listOf(item("a", 1.0), item("b", 5.0), item("c", 9.0)), "")
        val sys = LangSystem("s", "n", "en", listOf("es"), 0.0, 0.0)
        val p = CefrPlacement("B1", false, 4.0, listOf("c"), emptyList(), null)
        val st = Cefr.apply(StudyState(), sys, corpus, "es", p, 0)
        assertEquals(setOf("es:a", "es:c"), st.cards.keys)
        assertTrue(st.started("es:a"))
    }

    @Test
    fun answersIgnoreCaseAccentsAndArticles() {
        assertTrue(Answers.matches("cafe", "café", "es"))
        assertTrue(Answers.matches("gato", "el gato", "es"))
        assertFalse(Answers.matches("", "x", "es"))
    }
}
