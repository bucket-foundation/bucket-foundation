package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ListenCardsTest {
    private val corpus = CorpusFixture.corpus

    @Test
    fun pickerFollowsTheIosLadderInLangSystemsSwift() {
        assertEquals(ExerciseKind.Recognize, ExercisePicker.kind(isNew = true, reps = 0, lapsed = false, latin = true, roll = 0.1))
        assertEquals(ExerciseKind.Produce, ExercisePicker.kind(false, 1, false, true, 0.9), "LangSystems.swift:909 reps <= 1 or lapsed picks choose")
        assertEquals(ExerciseKind.Produce, ExercisePicker.kind(false, 5, true, true, 0.1), "LangSystems.swift:909 lapsed picks choose")
        assertEquals(ExerciseKind.Listen, ExercisePicker.kind(false, 2, false, true, 0.49), "LangSystems.swift:922 reps == 2, roll < 0.5 listen")
        assertEquals(ExerciseKind.Recognize, ExercisePicker.kind(false, 2, false, true, 0.5), "LangSystems.swift:922 reps == 2 else reverse")
        assertEquals(ExerciseKind.Listen, ExercisePicker.kind(false, 5, false, latin = false, roll = 0.79), "LangSystems.swift:957 non-Latin roll < 0.8 listen")
        assertEquals(ExerciseKind.Produce, ExercisePicker.kind(false, 5, false, latin = false, roll = 0.8), "LangSystems.swift:957 non-Latin else choose")
        assertEquals(ExerciseKind.Produce, ExercisePicker.kind(false, 5, false, true, 0.84), "LangSystems.swift:964 roll < 0.85 translate")
        assertEquals(ExerciseKind.TypeHeard, ExercisePicker.kind(false, 5, false, true, 0.85), "LangSystems.swift:965 type what you hear")
        assertEquals(ExerciseKind.SpellHeard, ExercisePicker.kind(false, 3, false, latin = false, roll = 0.1, heritage = true), "LangSystems.swift:879 heritage non-Latin spells what it hears")
        assertEquals(ExerciseKind.Produce, ExercisePicker.kind(false, 3, false, latin = true, roll = 0.1, heritage = true))
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
        val heritage = StudySession(corpus, "en", listOf("ru"), matured(listOf("ru"), 3), "2026-11-13", 10, SeededRandom(1uL), newPerLang = 0, heritage = setOf("ru"))
        assertEquals(ExerciseKind.SpellHeard, heritage.current?.kind)
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

class LadderGapTest {
    @Test
    fun sentenceClozeAndSpeakRungsAreNotPortedAndFallThroughAsIosDoesWithoutThem() {
        val notPorted = setOf("sentence", "wordbank", "cloze", "speak", "translate-typed", "cognate", "false-friend", "intro")
        val androidKinds = ExerciseKind.entries.map { it.name.lowercase() }.toSet()
        assertTrue(notPorted.none { it in androidKinds }, "LangSystems.swift:925, :949 and :963 deal sentence, cloze and speak only when the data or speech exists")
        assertEquals(ExerciseKind.Produce, ExercisePicker.kind(false, 5, false, true, 0.3), "with no sentence (:925), no cloze (:949) and no speech (:963), iOS lands on translate (:964)")
        assertEquals(ExerciseKind.Listen, ExercisePicker.kind(false, 5, false, false, 0.3), "non-Latin without sentence or cloze lands on listen (:957)")
    }
}
