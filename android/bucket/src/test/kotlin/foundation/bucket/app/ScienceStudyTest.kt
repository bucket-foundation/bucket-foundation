package foundation.bucket.app

import foundation.bucket.core.model.Atom
import foundation.bucket.core.model.Deck
import foundation.bucket.core.model.QuizItem
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ScienceStudyTest {
    private val deck = Deck(atoms = listOf(
        Atom("a", "Atom A", summary = "A", quiz = listOf(QuizItem("recall", "A?", "a"))),
        Atom("b", "Atom B", requires = listOf("a"), summary = "B"),
        Atom("c", "Atom C", summary = "C", quiz = listOf(QuizItem("apply", "C?", "c"))),
    ))

    @Test
    fun newAtomsWaitForPrerequisites() {
        val q = ScienceStudy.queue(mapOf("d" to deck), ScienceState(), "2026-11-13", 0)
        assertEquals(listOf("a", "c"), q.map { it.atom.id })
        assertEquals("A?", q.first().prompt)
        assertEquals("What is Atom B?", ScienceStudy.queue(mapOf("d" to deck), ScienceStudy.grade(ScienceState(), q.first(), true, "2026-11-13", 0), "2026-11-13", 0).first { it.atom.id == "b" }.prompt)
    }

    @Test
    fun dailyNewCapAndDueReviews() {
        var s = ScienceState()
        val first = ScienceStudy.queue(mapOf("d" to deck), s, "2026-11-13", 0)
        first.forEach { s = ScienceStudy.grade(s, it, true, "2026-11-13", 0) }
        assertEquals(2, s.newToday)
        assertTrue(ScienceStudy.queue(mapOf("d" to deck), s, "2026-11-13", 1).none { !it.isNew })
        val next = ScienceStudy.queue(mapOf("d" to deck), s, "2026-11-14", 86_400_001)
        assertEquals(setOf("a", "c"), next.filter { !it.isNew }.map { it.atom.id }.toSet())
        assertEquals(listOf("b"), next.filter { it.isNew }.map { it.atom.id })
    }

    @Test
    fun newCountResetsOnANewDay() {
        val q = ScienceStudy.queue(mapOf("d" to deck), ScienceState(newToday = 5, newDay = "2026-11-12"), "2026-11-13", 0)
        assertEquals(2, q.count { it.isNew })
        assertEquals(0, ScienceStudy.queue(mapOf("d" to deck), ScienceState(newToday = 5, newDay = "2026-11-13"), "2026-11-13", 0).size)
    }
}

class BucketSafetyTest {
    @Test
    fun prerequisiteThatCannotBeStudiedDoesNotBlock() {
        val deck = Deck(atoms = listOf(Atom("empty", "Empty"), Atom("x", "X", requires = listOf("empty"), summary = "x")))
        assertEquals(listOf("x"), ScienceStudy.queue(mapOf("d" to deck), ScienceState(), "2026-11-13", 0).map { it.atom.id })
    }

    @Test
    fun canonLinksStayOnBucketHttps() {
        assertEquals("https://www.bucket.foundation/canon/7", CanonLinks.safe("/canon/7"))
        assertEquals("https://bucket.foundation/c", CanonLinks.safe("https://bucket.foundation/c"))
        assertEquals(null, CanonLinks.safe("http://www.bucket.foundation/c"))
        assertEquals(null, CanonLinks.safe("https://evil.example/c"))
        assertEquals(null, CanonLinks.safe("//evil.example/c"))
    }

    @Test
    fun deckCacheNamesCannotEscape() {
        val n = DeckFiles.name("../../etc/passwd")
        assertTrue('/' !in n && !n.contains(".."))
        assertTrue(n != DeckFiles.name("etcpasswd"))
    }

    @Test
    fun lessonsKeepIdentifiersAndMath() {
        assertEquals("Heat flow\nUse snake_case and a*b and bold", Lessons.plain("## Heat flow\nUse `snake_case` and a*b and **bold**"))
    }
}
