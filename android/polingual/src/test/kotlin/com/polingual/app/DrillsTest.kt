package com.polingual.app

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.Exercise
import foundation.bucket.core.engine.ExerciseKind
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.StudyState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DrillsTest {
    @Test
    fun everyScriptParses() {
        for (lang in LetterData.raw.keys) {
            val u = assertNotNull(Letters.unit(lang))
            assertTrue(u.letters.size >= 10, lang)
            assertTrue(u.title.isNotBlank(), lang)
        }
        assertNull(Letters.unit("es"))
        val fa = Letters.unit("fa")!!.letters.first()
        assertEquals(Letter("ا", "ā", "alef"), fa)
    }

    @Test
    fun lettersComeInFivesAndBecomeDue() {
        assertEquals(5, Letters.next(StudyState(), "ru").size)
        val graded = Letters.grade(StudyState(), "ru", "а", true, 0)
        assertFalse("а" in Letters.next(graded, "ru").map { it.ch })
        assertEquals(listOf("а"), Letters.due(graded, "ru", Long.MAX_VALUE - 1).map { it.ch })
        assertTrue(Letters.due(graded, "ru", 0).isEmpty())
    }

    @Test
    fun blockDoneAtEightyPercent() {
        val u = Letters.unit("ko")!!
        val cards = u.letters.take(19).associate { Letters.cardId("ko", it.ch) to CardState(reps = 1) }
        assertFalse(Letters.done(StudyState(cards = cards), "ko"))
        val most = u.letters.take(20).associate { Letters.cardId("ko", it.ch) to CardState(reps = 1) }
        assertTrue(Letters.done(StudyState(cards = most), "ko"))
    }

    @Test
    fun letterQuestionsBothWays() {
        val u = Letters.unit("el")!!
        val l = u.letters[2]
        val see = Letters.question("el", l, u, SeededRandom(1uL), hear = false)
        assertEquals(l.sound, see.answer)
        assertEquals(4, see.options.distinct().size)
        val hear = Letters.question("el", l, u, SeededRandom(1uL), hear = true)
        assertEquals(l.ch, hear.answer)
        assertEquals("el", hear.speakLang)
    }

    @Test
    fun soundPairsPickNearestForms() {
        assertEquals(1, SoundDrills.distance("gato", "pato"))
        val forms = listOf("gato", "pato", "gata", "mato", "perro", "casa")
        val corpus = LangCorpus(forms.mapIndexed { i, f -> LangItem("i$i", ItemKind.Word, 1.0, 1, "x", f, mapOf("en" to "e$i", "es" to f), emptyMap(), null, emptyList(), null, emptyMap()) }, "")
        val state = StudyState(cards = mapOf("es:i0" to CardState(reps = 1)))
        val q = assertNotNull(SoundDrills.pair(corpus, "en", "es", state, SeededRandom(3uL)))
        assertEquals("gato", q.answer)
        assertEquals(setOf("gato", "pato", "gata", "mato"), q.options.toSet())
    }

    @Test
    fun studyMixRotatesKindsByReps() {
        val w = GameWord("i1", "es", "gato", "cat", "en")
        val ex = Exercise(w, ExerciseKind.Recognize, "gato", "cat", listOf("cat", "dog", "cow", "pig"), false)
        assertNull(StudyMix.question(ex, 1, true, "en"))
        assertEquals(QuestionKind.Translate, StudyMix.question(ex, 2, true, "en")!!.kind)
        assertEquals(QuestionKind.Listen, StudyMix.question(ex, 3, true, "en")!!.kind)
        assertNull(StudyMix.question(ex, 3, false, "en"))
        assertNull(StudyMix.question(ex.copy(isNew = true), 2, true, "en"))
        assertTrue(StudyMix.question(ex, 2, true, "en")!!.check("Gato"))
    }
}
