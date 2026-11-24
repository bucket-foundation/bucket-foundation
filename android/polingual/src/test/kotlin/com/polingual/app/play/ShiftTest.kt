package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ShiftTest {
    @Test
    fun centerRowReadsOneLetterPerColumnAndWraps() {
        val cols = listOf(listOf("c", "g"), listOf("a", "o"), listOf("s", "t"), listOf("a", "o"))
        assertEquals("casa", Shift.centerWord(cols, listOf(0, 0, 0, 0)))
        assertEquals("gasa", Shift.centerWord(cols, Shift.rotate(listOf(0, 0, 0, 0), 0, 1)))
        assertEquals("goto", Shift.centerWord(cols, listOf(-1, 1, 1, 1)))
    }

    @Test
    fun hintsRevealFromTheStart() {
        assertEquals("_ _ _ _", Shift.hintFor("gato", 0))
        assertEquals("g a _ _", Shift.hintFor("gato", 2))
    }

    @Test
    fun cleanKeepsLowercaseLettersOfTheLength() {
        assertEquals("gato", Shift.clean("Gato", 4))
        assertEquals("niño", Shift.clean("niño", 4))
        assertNull(Shift.clean("gatos", 4))
        assertNull(Shift.clean("ga-o", 4))
        assertTrue(Shift.spellable("gato", listOf(listOf("g"), listOf("a"), listOf("t"), listOf("o"))))
        assertFalse(Shift.spellable("gata", listOf(listOf("g"), listOf("a"), listOf("t"), listOf("o"))))
    }
}

class ShiftCorpusTest {
    @Test
    fun todaysBoardHoldsSixSpellableTargets() {
        val date = java.time.LocalDate.now().toString()
        val b = Shift.board(TestCorpus.corpus.items, date)!!
        assertEquals(6, b.targets.size)
        b.targets.forEach { assertTrue(Shift.spellable(it.form, b.columns)) }
        val moves = b.targets.joinToString("\n") { t -> Shift.letters(t.form).mapIndexed { i, ch -> b.columns[i].indexOf(ch) }.joinToString(" ") }
        java.io.File("build/shift-solution.txt").writeText(moves + "\n")
    }
}
