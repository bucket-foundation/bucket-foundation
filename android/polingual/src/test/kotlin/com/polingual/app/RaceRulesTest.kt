package com.polingual.app

import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyGames
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RaceRulesTest {
    private val screens = setOf(LobbyGame.FlagTiles, LobbyGame.Shift, LobbyGame.Atlas, LobbyGame.Polyword, LobbyGame.Babel, LobbyGame.Snake, LobbyGame.Forehead, LobbyGame.ISpy)

    @Test
    fun everyRaceGameHasAnAndroidScreen() {
        LobbyGames.race.filter(LobbyGames::playable).forEach { g -> assertTrue(g in screens || RaceRules.kindFor(g) != null, g.wire) }
        assertEquals(LobbyGames.race.toSet() - LobbyGame.FlagDuel, LobbyGames.race.filter(LobbyGames::playable).toSet())
        assertFalse(LobbyGames.playable(LobbyGame.Unknown))
    }

    @Test
    fun gameKindsMapToTheirRace() {
        assertEquals(GameKind.Mini, RaceRules.kindFor(LobbyGame.Mini))
        assertEquals(GameKind.WordGroups, RaceRules.kindFor(LobbyGame.WordGroups))
        assertEquals(GameKind.Match, RaceRules.kindFor(LobbyGame.Match))
        assertEquals(GameKind.Voice, RaceRules.kindFor(LobbyGame.Voice))
        assertEquals(GameKind.Letters, RaceRules.kindFor(LobbyGame.Letters))
        assertNull(RaceRules.kindFor(LobbyGame.FlagDuel))
        assertNull(RaceRules.kindFor(LobbyGame.Daily))
        assertEquals(3, RaceRules.hits("10110"))
    }

    @Test
    fun noRaceMeansNoRaceReport() {
        assertFalse(RaceSession.active)
        assertFalse(RaceSession.finishedKind(GameKind.Mini, "1"))
    }
}
