package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class StudyTest {
    private val corpus = CorpusFixture.corpus

    @Test
    fun firstSessionTeachesFiveNewWordsPerLanguage() {
        val s = StudySession(corpus, "en", listOf("fr", "es"), StudyState(), "2026-11-12", 0, SeededRandom(1uL))
        assertEquals(10, s.total)
        while (!s.finished) s.answer(s.current!!.answer)
        assertEquals(10, s.state.cards.size)
        assertEquals(listOf("2026-11-12"), s.state.days)
        val again = StudySession(corpus, "en", listOf("fr", "es"), s.state, "2026-11-12", 1, SeededRandom(1uL))
        assertEquals(0, again.total)
    }

    @Test
    fun missesComeBackInTheSameSession() {
        val s = StudySession(corpus, "en", listOf("fr"), StudyState(), "2026-11-12", 0, SeededRandom(1uL), newPerLang = 1)
        val first = s.current!!
        s.answer(first.options.first { it != first.answer })
        assertEquals(first.word.itemId, s.current!!.word.itemId)
        s.answer(s.current!!.answer)
        assertTrue(s.finished)
        assertEquals(1, s.state.cards.values.single().lapses)
    }

    @Test
    fun dueCardsReturnNextDay() {
        val s = StudySession(corpus, "en", listOf("fr"), StudyState(), "2026-11-12", 0, SeededRandom(1uL), newPerLang = 2)
        while (!s.finished) s.answer(s.current!!.answer)
        val next = StudySession(corpus, "en", listOf("fr"), s.state, "2026-11-13", Scheduler.DAY_MS + 1, SeededRandom(2uL), newPerLang = 0)
        assertEquals(2, next.total)
    }

    @Test
    fun streakCountsConsecutiveDays() {
        assertEquals(3, Streak.count(listOf("2026-11-10", "2026-11-11", "2026-11-12"), "2026-11-12"))
        assertEquals(2, Streak.count(listOf("2026-11-10", "2026-11-11"), "2026-11-12"))
        assertEquals(0, Streak.count(listOf("2026-11-01"), "2026-11-12"))
    }
}

class SilentStudyTest {
    private val corpus = CorpusFixture.corpus

    private fun session(state: StudyState = StudyState()) = StudySession(corpus, "en", listOf("fr"), state, "2026-11-12", 0, SeededRandom(1uL), newPerLang = 2)

    private fun listen(s: StudySession): Exercise {
        val w = s.current!!.word
        val ex = Exercise(w, ExerciseKind.Listen, w.form, w.gloss, listOf(w.gloss, "x"), false)
        s.enqueue(ex)
        return ex
    }

    @Test
    fun soundCardsAreDeferredNotDroppedAndReturnWhenSoundIsBack() {
        val s = session()
        val ex = listen(s)
        val before = s.remaining
        assertEquals(1, s.deferSoundCards())
        assertEquals(before - 1, s.remaining)
        while (!s.finished) s.answer(s.current!!.answer)
        assertEquals(1, s.deferredCount)
        s.resumeDeferred()
        assertEquals(ex, s.current)
    }

    @Test
    fun aSkippedSoundCardKeepsItsSchedule() {
        val first = session()
        while (!first.finished) first.answer(first.current!!.answer)
        val due = first.state.copy(cards = first.state.cards.mapValues { it.value.copy(due = 0) })
        val s = StudySession(corpus, "en", listOf("fr"), due, "2026-11-13", 10, SeededRandom(2uL), newPerLang = 0)
        val ex = listen(s)
        s.deferSoundCards()
        while (!s.finished) s.answer(s.current!!.answer)
        assertEquals(1, s.deferredCount)
        val before = due.cards.getValue(ex.word.id)
        val graded = s.state.cards.getValue(ex.word.id)
        assertTrue(graded.reps == before.reps + 1, "the visual card for the word was answered once")
        val untouched = StudySession(corpus, "en", listOf("fr"), due, "2026-11-13", 10, SeededRandom(2uL), newPerLang = 0)
        listen(untouched)
        untouched.deferSoundCards()
        assertEquals(due.cards, untouched.state.cards)
    }

    @Test
    fun onlyHearingCardsNeedSound() {
        assertEquals(listOf(ExerciseKind.Listen, ExerciseKind.TypeHeard), ExerciseKind.entries.filter { it.needsSound })
    }
}
