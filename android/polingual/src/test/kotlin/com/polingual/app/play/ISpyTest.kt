package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ISpyTest {
    @Test
    fun unitMatchesTheWebHash() {
        assertEquals(0.021897681057453156, ISpy.unit("at:1:0:bot-ama"))
        assertEquals(0.8468830871861428, ISpy.unit("ok:1:0:bot-ama"))
    }

    @Test
    fun pointsRewardSpeedAndStreakWithACap() {
        assertEquals(0, ISpy.points(false, 0, 12, 3))
        assertEquals(200, ISpy.points(true, 0, 12, 0))
        assertEquals(100, ISpy.points(true, 12_000, 12, 0))
        assertEquals(150 + 4 * 25, ISpy.points(true, 6_000, 12, 9))
        val (t, p) = ISpy.award(Tally(), true, 0, 12)
        assertEquals(Tally(200, 1), t)
        assertEquals(200, p)
        assertEquals(0, ISpy.award(t, false, 0, 12).first.streak)
    }

    @Test
    fun botTurnsLandInsideTheirWindow() {
        val turns = ISpy.botTurns("1", 0, 12)
        assertEquals(3, turns.size)
        turns.zip(ISpy.BOTS).forEach { (t, b) -> assertTrue(t.atMs in Math.round(12000 * b.from)..Math.round(12000 * b.to)) }
        assertEquals(Math.round(12000 * (0.2 + 0.35 * 0.021897681057453156)), turns[0].atMs)
        assertEquals(true, turns[0].correct)
    }

    @Test
    fun scenesLayTwentyObjectsAndRoundsUseThem() {
        ISpy.SCENES.forEach { assertEquals(20, it.objects.size) }
        val r = ISpy.rounds(TestCorpus.corpus.items, "42", "en", listOf("zh", "ru", "hi", "es"), ISpy.ROUNDS)
        assertTrue(r.size >= 4)
        r.forEach { assertTrue(it.answer in it.choices && it.lang != "en") }
        assertEquals(r, ISpy.rounds(TestCorpus.corpus.items, "42", "en", listOf("zh", "ru", "hi", "es"), ISpy.ROUNDS))
    }
}
