package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RevealRulesTest {
    @Test
    fun polywordRevealsOnlyWhenSolvedOrOutOfGuesses() {
        assertFalse(RevealRules.polyword(listOf("gatos"), "perro"))
        assertTrue(RevealRules.polyword(listOf("gatos", "perro"), "perro"))
        assertTrue(RevealRules.polyword(List(6) { "gatos" }, "perro"))
    }

    @Test
    fun flagTilesRevealsTheMissedTileOnly() {
        assertFalse(RevealRules.flagTiles(RunState(phase = RunPhase.Running, index = 3)))
        assertTrue(RevealRules.flagTiles(RunState(phase = RunPhase.Missed, missed = 3)))
        assertTrue(RevealRules.flagTiles(RunState(phase = RunPhase.Over)))
    }

    @Test
    fun babelRevealsWhenTheLevelEnds() {
        assertFalse(RevealRules.babel(cleared = 6, goal = 15, movesLeft = 4))
        assertTrue(RevealRules.babel(cleared = 15, goal = 15, movesLeft = 4))
        assertTrue(RevealRules.babel(cleared = 3, goal = 15, movesLeft = 0))
    }

    @Test
    fun shiftRevealsOnceEveryTargetIsFound() {
        val t = listOf(ShiftTarget("it", "nero", "black"), ShiftTarget("it", "pane", "bread"))
        assertFalse(RevealRules.shift(listOf("nero"), t))
        assertTrue(RevealRules.shift(listOf("pane", "nero", "zero"), t))
    }

    @Test
    fun snakeRevealsOnDeathOrTimeUp() {
        assertFalse(RevealRules.snake(alive = true, secondsLeft = 30))
        assertTrue(RevealRules.snake(alive = false, secondsLeft = 30))
        assertTrue(RevealRules.snake(alive = true, secondsLeft = 0))
    }

    @Test
    fun atlasRevealsAfterTheLockIn() {
        assertFalse(RevealRules.atlas(guessed = false))
        assertTrue(RevealRules.atlas(guessed = true))
    }

    @Test
    fun foreheadRevealsAfterTheRound() {
        assertFalse(RevealRules.forehead(cardsLeft = 20, secondsLeft = 12))
        assertTrue(RevealRules.forehead(cardsLeft = 0, secondsLeft = 12))
        assertTrue(RevealRules.forehead(cardsLeft = 20, secondsLeft = 0))
    }

    @Test
    fun iSpyRevealsOnTapOrTimeout() {
        assertFalse(RevealRules.iSpy(tapped = false, elapsedMs = 5_000))
        assertTrue(RevealRules.iSpy(tapped = true, elapsedMs = 5_000))
        assertTrue(RevealRules.iSpy(tapped = false, elapsedMs = 12_000))
    }

    @Test
    fun sameWordRevealsOnlyInTheRevealPhase() {
        assertFalse(RevealRules.sameWord(revealPhase = false))
        assertTrue(RevealRules.sameWord(revealPhase = true))
    }
}
