package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ListenCardsTest {
    private val corpus = CorpusFixture.corpus

    @Test
    fun pickerFollowsTheIosLadder() {
        assertEquals(ExerciseKind.Recognize, ExercisePicker.kind(isNew = true, reps = 0, lapsed = false, latin = true, roll = 0.1))
        assertEquals(ExerciseKind.Listen, ExercisePicker.kind(false, 2, false, true, 0.2))
        assertEquals(ExerciseKind.Produce, ExercisePicker.kind(false, 2, false, true, 0.7))
        assertEquals(ExerciseKind.Listen, ExercisePicker.kind(false, 5, false, latin = false, roll = 0.5))
        assertEquals(ExerciseKind.TypeHeard, ExercisePicker.kind(false, 5, false, true, 0.9))
        assertEquals(ExerciseKind.Recognize, ExercisePicker.kind(false, 5, true, true, 0.1))
    }

    @Test
    fun typedAnswersAcceptAccentsAndOneSlip() {
        assertEquals(Verdict.Exact, Typed.judge("Perro.", listOf("perro"), "es"))
        assertEquals(Verdict.Close, Typed.judge("arbol", listOf("árbol"), "es"))
        assertEquals(Verdict.Close, Typed.judge("mañaan", listOf("mañana"), "es"))
        assertEquals(Verdict.Wrong, Typed.judge("gato", listOf("perro"), "es"))
        assertEquals(Verdict.Wrong, Typed.judge("  ", listOf("perro"), "es"))
        assertEquals(Verdict.Exact, Typed.judge("كتاب", listOf("كِتَاب"), "ar"))
    }

    private fun matured(langs: List<String>, reps: Int): StudyState {
        val first = StudySession(corpus, "en", langs, StudyState(), "2026-11-12", 0, SeededRandom(1uL), newPerLang = 5)
        while (!first.finished) first.answer(first.current!!.answer)
        return first.state.copy(cards = first.state.cards.mapValues { it.value.copy(due = 0, reps = reps, lapses = 0) })
    }

    @Test
    fun aRealSessionDealsListenAndTypeHeardCards() {
        val kinds = (1..20).flatMap { seed ->
            val s = StudySession(corpus, "en", listOf("fr", "es"), matured(listOf("fr", "es"), 5), "2026-11-13", 10, SeededRandom(seed.toULong()), newPerLang = 0)
            generateSequence { s.current?.also { s.answer(it.answer) } }.map { it.kind }.toList()
        }.toSet()
        assertTrue(ExerciseKind.TypeHeard in kinds)
        val listen = StudySession(corpus, "en", listOf("fr"), matured(listOf("fr"), 2), "2026-11-13", 10, SeededRandom(3uL), newPerLang = 0)
        val seen = generateSequence { listen.current?.also { listen.answer(it.answer) } }.map { it.kind }.toList()
        assertTrue(ExerciseKind.Listen in seen)
    }

    @Test
    fun silentModeDefersTheRealSessionsSoundCardsWithoutGradingThem() {
        val due = matured(listOf("fr"), 2)
        val s = StudySession(corpus, "en", listOf("fr"), due, "2026-11-13", 10, SeededRandom(3uL), newPerLang = 0)
        val deferred = s.deferSoundCards()
        assertTrue(deferred > 0)
        val skippedIds = mutableSetOf<String>()
        while (!s.finished) s.answer(s.current!!.answer)
        s.resumeDeferred()
        while (!s.finished) { skippedIds += s.current!!.word.id; assertTrue(s.current!!.kind.needsSound); s.answer(s.current!!.answer) }
        assertEquals(deferred, skippedIds.size)
        val untouched = StudySession(corpus, "en", listOf("fr"), due, "2026-11-13", 10, SeededRandom(3uL), newPerLang = 0)
        untouched.deferSoundCards()
        while (!untouched.finished) untouched.answer(untouched.current!!.answer)
        skippedIds.forEach { assertEquals(due.cards[it], untouched.state.cards[it]) }
    }

    @Test
    fun typeHeardGradesTypedText() {
        val due = matured(listOf("es"), 5)
        val s = (1..40).asSequence().map { StudySession(corpus, "en", listOf("es"), due, "2026-11-13", 10, SeededRandom(it.toULong()), newPerLang = 0) }
            .first { ses -> generateSequence { ses.current?.takeIf { it.kind != ExerciseKind.TypeHeard }?.also { ses.answer(it.answer) } }.count(); ses.current?.kind == ExerciseKind.TypeHeard }
        val ex = s.current!!
        assertEquals(Verdict.Exact, s.answerTyped(ex.answer.uppercase()))
        assertEquals(ex.word.form, ex.answer)
    }
}
