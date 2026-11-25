package com.polingual.app

import com.polingual.app.play.ISpy
import foundation.bucket.core.model.LobbyPrompt
import foundation.bucket.core.model.LobbyPromptMode
import foundation.bucket.core.ui.pl.PL
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LobbyGamesAndroidTest {
    @Test
    fun aSpyPromptFindsItsSceneFromTheChoices() {
        val scene = ISpy.SCENES.first()
        val ids = scene.objects.map { it.id }
        assertEquals(scene.id, LobbySpy.scene(ids.reversed())?.id)
        assertNull(LobbySpy.scene(listOf("not-an-object")))
    }

    @Test
    fun spyMarksShowThePickAndTheAnswer() {
        val p = LobbyPrompt(round = 0, mode = LobbyPromptMode.Spy, lang = "es", gloss = "gato", choices = listOf("cat", "dog"), answer = "cat")
        assertEquals(mapOf("dog" to PL.Vermilion, "cat" to PL.Malachite), LobbySpy.marks(p, "dog", false))
        assertEquals(mapOf("cat" to PL.Malachite), LobbySpy.marks(p.copy(answer = null), "cat", true))
    }

    @Test
    fun theRaceClockReadsMinutesAndSeconds() {
        assertEquals("5:00", RaceClock.text(300.0))
        assertEquals("0:09", RaceClock.text(8.2))
        assertEquals("0:00", RaceClock.text(-3.0))
    }

    @Test
    fun theRaceSessionSetsTheDeckDayAndReportsOnlyItsGame() {
        val lobby = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }.decodeFromString(foundation.bucket.core.model.Lobby.serializer(), """
            {"id":"L9","code":"ABC123","name":"Room","game":"shift","root":"fr","targets":["es"],"seed":"42","status":"playing","listed":true,
            "rounds":10,"roundSeconds":30,"version":1,"now":"2026-11-12T10:00:00Z","isHost":true,"players":[],"messages":[],"prompts":[],"results":[]}
        """.trimIndent())
        val scores = mutableListOf<Int>()
        RaceSession.open(lobby) { scores += it }
        assertEquals("race-42", deckDay())
        assertEquals("fr", RaceSession.root)
        RaceSession.finished(foundation.bucket.core.model.LobbyGame.FlagTiles, hits = 3)
        RaceSession.finished(foundation.bucket.core.model.LobbyGame.Shift, hits = 3)
        assertEquals(listOf(300), scores)
        RaceSession.close("L9")
        assertEquals(10, deckDay().length)
    }
}
