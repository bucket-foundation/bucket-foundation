package com.polingual.app

import foundation.bucket.core.model.LeaveResult
import foundation.bucket.core.model.Lobby
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyPlayer
import foundation.bucket.core.model.LobbyStatus
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class FamilyCopyTest {
    private fun p(id: String, ready: Boolean, online: Boolean = true) = LobbyPlayer(id, id, ready, 0, false, false, online, false)
    private fun lobby(vararg players: LobbyPlayer) = Lobby("L", "C", "N", LobbyGame.Daily, "en", listOf("es"), "1", LobbyStatus.Lobby, true, 3, 8, version = 1, now = "", isHost = true, players = players.toList(), messages = emptyList(), prompts = emptyList(), results = emptyList())

    @Test
    fun waitingOnNamesWhoIsNotReady() {
        assertEquals("Two players start the game.", FamilyCopy.waitingOn(lobby(p("Ana", true))))
        assertEquals("Waiting for Bo to get ready.", FamilyCopy.waitingOn(lobby(p("Ana", true), p("Bo", false))))
        assertEquals("Waiting for 2 players to get ready.", FamilyCopy.waitingOn(lobby(p("Ana", false), p("Bo", false))))
        assertEquals("Everyone is ready.", FamilyCopy.waitingOn(lobby(p("Ana", true), p("Bo", true), p("Cy", false, online = false))))
    }

    @Test
    fun nextGameAndLeaveCopy() {
        assertEquals("Next game in 42 s", FamilyCopy.nextGame(42, false))
        assertEquals("Next game starting", FamilyCopy.nextGame(0, true))
        assertEquals("The host starts the next game.", FamilyCopy.nextGame(null, false))
        assertEquals("You left. Another player hosts the room now.", FamilyCopy.leftRoom(LeaveResult.Handoff))
        assertNull(FamilyCopy.leftRoom(LeaveResult.Left))
        assertEquals("Family night", FamilyCopy.setupLabel("sequence", night = true))
        assertEquals("Mix", FamilyCopy.setupLabel("mix", night = false))
    }
}
