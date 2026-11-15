package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals

class FlagTilesTest {
    @Test
    fun aRunScoresStopsOnMissAndContinuesOnce() {
        var s = FlagTilesRules.step(RunState(), RunEvent.Start)
        s = FlagTilesRules.step(s, RunEvent.Tap(2, 2))
        assertEquals(Triple(RunPhase.Running, 1, 1), Triple(s.phase, s.index, s.score))
        s = FlagTilesRules.step(s, RunEvent.Tap(0, 3))
        assertEquals(Triple(RunPhase.Missed, 1, 0), Triple(s.phase, s.missed, s.picked))
        s = FlagTilesRules.step(s, RunEvent.Continue)
        assertEquals(Triple(RunPhase.Running, 2, true), Triple(s.phase, s.index, s.continued))
        s = FlagTilesRules.step(s, RunEvent.Timeout)
        assertEquals(RunPhase.Missed, s.phase)
        assertEquals(RunPhase.Missed, FlagTilesRules.step(s, RunEvent.Continue).phase)
        assertEquals(RunPhase.Over, FlagTilesRules.step(s, RunEvent.End).phase)
    }

    @Test
    fun fallSpeedsUpEveryTenWordsToAFloor() {
        assertEquals(3400, FlagTilesRules.fallMs(0))
        assertEquals(3400, FlagTilesRules.fallMs(9))
        assertEquals(2992, FlagTilesRules.fallMs(10))
        assertEquals(1100, FlagTilesRules.fallMs(500))
    }

    @Test
    fun webRandomMatchesTheWebSequence() {
        val r = WebRandom("12345")
        assertEquals(7.204309649955221e-7, r.next())
        assertEquals(0.6095996695066922, r.next())
        assertEquals(0.6334233905286124, r.next())
        assertEquals(0.08375681564211845, WebRandom.unit("abc"))
        assertEquals("863983924936705", WebRandom.seedOf("flag-tiles:2026-11-13"))
    }

    @Test
    fun ghostsAreFiveSortedAndStablePerDay() {
        val g = FlagTilesRules.ghosts("2026-11-13")
        assertEquals(5, g.size)
        assertEquals(g, FlagTilesRules.ghosts("2026-11-13"))
        assertEquals(g.sortedByDescending { it.score }, g)
    }
}

class FlagLaneMarksTest {
    @Test
    fun aMissMarksTheAnswerAndThePick() {
        assertEquals(listOf(null, null, null, null), FlagTilesRules.laneMarks(RunState(phase = RunPhase.Running), 2))
        assertEquals(listOf(false, null, true, null), FlagTilesRules.laneMarks(RunState(phase = RunPhase.Missed, picked = 0), 2))
    }
}
