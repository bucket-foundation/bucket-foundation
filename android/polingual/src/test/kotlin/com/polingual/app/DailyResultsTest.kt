package com.polingual.app

import foundation.bucket.core.engine.GamePrompt
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.GroupLink
import foundation.bucket.core.engine.LetterPrompt
import foundation.bucket.core.engine.PromptMode
import foundation.bucket.core.engine.WordGroup
import kotlin.test.Test
import kotlin.test.assertEquals

class DailyResultsTest {
    private fun w(id: String, lang: String = "es") = GameWord(id, lang, "$id-$lang", id, "en")

    @Test
    fun quizSavesEveryPromptWordWithItsMark() {
        val prompts = listOf(GamePrompt(0, PromptMode.Form, w("dog"), listOf("a"), "a"), GamePrompt(1, PromptMode.Form, w("cat"), listOf("b"), "b"))
        val r = DailyResults.quiz(DailyGame.DailySet, "2027-1-5", prompts, listOf(true), 7)
        assertEquals("10", r.pattern)
        assertEquals(1 to 2, r.score to r.total)
        assertEquals(listOf(DailyWord("es", "dog", "dog-es", "dog", true), DailyWord("es", "cat", "cat-es", "cat", false)), r.words)
        assertEquals("daily-set", r.game)
    }

    @Test
    fun groupsScoreSolvedGroupsAndMarkTheirWords() {
        val a = WordGroup(GroupLink.Language("es"), listOf(w("one"), w("two")))
        val b = WordGroup(GroupLink.Theme("family"), listOf(w("son", "fr")))
        val r = DailyResults.groups("2027-1-5", listOf(a, b), listOf(a), "10", 1)
        assertEquals(1 to 2, r.score to r.total)
        assertEquals(listOf(true, true, false), r.words.map { it.right })
    }

    @Test
    fun speedPadsThePatternToFifteenAndMarksMisses() {
        val r = DailyResults.speed("2027-1-5", listOf(w("dog"), w("cat")), listOf(w("cat")), 3, 15, 1)
        assertEquals("111000000000000", r.pattern)
        assertEquals(listOf(true, false), r.words.map { it.right })
    }

    @Test
    fun lettersSaveTheLetterAsTheWord() {
        val r = DailyResults.letters("2027-1-5", listOf(LetterPrompt("ru", "б", "b", listOf("б"))), listOf(true), 1)
        assertEquals(DailyWord("ru", "abc:б", "б", "b", true), r.words.single())
    }

    @Test
    fun miniMarksEachEntry() {
        val e = foundation.bucket.core.engine.MiniEntry(w("uno"), listOf("U", "N", "O"), 0, 0, true, 1)
        val r = DailyResults.mini("2027-1-5", listOf(e, e.copy(number = 2)), listOf(true, false), 1)
        assertEquals("10", r.pattern)
        assertEquals(1 to 2, r.score to r.total)
    }
}
