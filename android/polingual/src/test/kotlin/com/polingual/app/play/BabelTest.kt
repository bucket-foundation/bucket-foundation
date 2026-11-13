package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class BabelTest {
    private val meanings = listOf("dog", "cat", "sun", "sea", "tree").map { m -> Meaning(m, m, mapOf("es" to "$m-es", "fr" to "$m-fr", "de" to "$m-de")) }
    private val langs = listOf("es", "fr", "de")
    private fun deal(seed: Int, start: Int = 0) = XorRng(seed).let { r -> Dealer(meanings, langs, r::next, start) }

    @Test
    fun rngMatchesTheWebXorshift() {
        val r = XorRng(7)
        assertEquals(0.00044065131805837154, r.next())
        assertEquals(0.10952103300951421, r.next())
        assertEquals(0.9038964069914073, r.next())
    }

    @Test
    fun freshBoardHasNoMatchAndIsSeeded() {
        val a = Babel.fresh(deal(7))
        assertEquals(Babel.SIZE * Babel.SIZE, a.size)
        assertEquals(0, Babel.matches(a).size)
        assertEquals(a.map { it.meaning }, Babel.fresh(deal(7)).map { it.meaning })
    }

    @Test
    fun threeOfAMeaningClearAcrossLanguagesAndRefill() {
        val rigged = Babel.fresh(deal(9)).toMutableList()
        rigged[0] = Cell(1, "dog", "es"); rigged[1] = Cell(2, "dog", "fr"); rigged[2] = Cell(3, "dog", "de")
        assertTrue(Babel.matches(rigged).containsAll(listOf(0, 2)))
        val out = Babel.resolve(rigged, deal(3, 1000))
        assertTrue(out.cleared.size >= 3)
        assertEquals(Babel.SIZE * Babel.SIZE, out.board.size)
        assertEquals(0, Babel.matches(out.board).size)
    }

    @Test
    fun onlyNeighboursSwap() {
        assertTrue(Babel.adjacent(0, 1))
        assertTrue(Babel.adjacent(0, Babel.SIZE))
        assertFalse(Babel.adjacent(Babel.SIZE - 1, Babel.SIZE))
        assertFalse(Babel.adjacent(0, 2))
        val b = Babel.fresh(deal(1))
        assertEquals(b[1], Babel.swapped(b, 0, 1)[0])
    }

    @Test
    fun levelsGetHarder() {
        assertTrue(Babel.level(5).goal > Babel.level(1).goal)
        assertTrue(Babel.level(10).moves <= Babel.level(1).moves)
    }

    @Test
    fun playableBoardsHoldALegalSwap() {
        for (seed in 1 until 30) {
            val b = Babel.playable(deal(seed))
            assertEquals(0, Babel.matches(b).size)
            assertTrue(Babel.hasMove(b))
        }
        val dead = List(Babel.SIZE * Babel.SIZE) { i -> Cell(i, listOf("dog", "cat", "sun")[(i / Babel.SIZE + i) % 3], "es") }
        assertFalse(Babel.hasMove(dead))
    }
}
