package com.polingual.app.play

import kotlin.math.PI
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SnakeTest {
    private val deck = SnakeDeck("es", listOf(SnakeWord("perro", "es", "dog")), listOf(SnakeWord("chien", "fr", "dog")))
    private val rand = { 0.5 }

    @Test
    fun snakesMoveTurnCappedAndKeepLength() {
        val s = Snakes.make("me", "You", false, 1.0, Pt(500.0, 500.0), 0.0, 0)
        val moved = Snakes.advance(s, PI / 2, 0.1)
        assertTrue(moved.body[0].x > 500)
        assertTrue(moved.angle > 0 && moved.angle < PI / 2)
        var t = s
        repeat(50) { t = Snakes.advance(t, 0.0, 0.05) }
        assertTrue(t.body.size <= Snakes.START_LEN)
    }

    @Test
    fun goodWordsGrowDecoysShrinkAndFieldRefills() {
        val me = Snakes.make("me", "You", false, 1.0, Pt(100.0, 100.0), 0.0, 0)
        val arena = Arena(listOf(me), listOf(FieldWord(1, 100.0, 100.0, "perro", "es", "dog", true)), 2, emptyList(), emptyList())
        val a = Snakes.eat(arena, deck, rand)
        assertEquals(Snakes.START_LEN + Snakes.GROW, a.snakes[0].length)
        assertEquals(1, a.eaten.size)
        assertEquals(Snakes.WORDS_ON_FIELD, a.words.size)
        val b = Snakes.eat(arena.copy(words = listOf(FieldWord(1, 100.0, 100.0, "chien", "fr", "dog", false))), deck, rand)
        assertEquals(maxOf(Snakes.MIN_LEN, Snakes.START_LEN - Snakes.SHRINK), b.snakes[0].length)
        assertEquals(1, b.bad.size)
    }

    @Test
    fun theSmallerOfTwoTouchingSnakesDies() {
        val big = Snakes.make("big", "Big", true, 1.0, Pt(300.0, 300.0), 0.0, 0).copy(length = 20)
        val small = Snakes.make("me", "You", false, 1.0, Pt(291.0, 300.0), PI, 0)
        assertEquals(listOf("me"), Snakes.collide(Arena(listOf(big, small), emptyList(), 0, emptyList(), emptyList())).died)
        assertEquals(listOf("big"), Snakes.collide(Arena(listOf(big.copy(length = 4), small.copy(length = 30)), emptyList(), 0, emptyList(), emptyList())).died)
    }

    @Test
    fun headOnContactCounts() {
        val a = Snakes.make("a", "A", true, 1.0, Pt(300.0, 300.0), 0.0, 0).copy(length = 20)
        val b = Snakes.make("me", "You", false, 1.0, Pt(305.0, 300.0), PI, 0)
        assertTrue("me" in Snakes.collide(Arena(listOf(a, b), emptyList(), 0, emptyList(), emptyList())).died)
    }

    @Test
    fun deckFromTheCorpusSplitsGoodWordsFromDecoys() {
        val d = Snakes.deck(TestCorpus.corpus.items, "es", listOf("fr", "it", "pt", "de", "nl"), "12345")
        assertTrue(d.good.size >= 40)
        assertTrue(d.good.all { it.lang == "es" })
        assertTrue(d.decoys.none { it.lang == "es" })
        assertTrue(d.decoys.none { dc -> d.good.any { it.form.equals(dc.form, ignoreCase = true) } })
    }
}
