package foundation.bucket.core.net

import foundation.bucket.core.model.SeatBand
import foundation.bucket.core.model.LeaveResult
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.PlayerCard
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LobbyHostApiTest {
    private val lobby = """{"id":"L1","code":"ABC123","name":"Room","game":"daily","root":"en","targets":["es"],"seed":"42","status":"done","listed":true,"rounds":3,"roundSeconds":8,"version":4,"now":"2026-11-27T10:00:00Z","isHost":true,"players":[],"messages":[],"prompts":[],"results":[],"ended":true}"""

    private fun api(seen: MutableList<String>, body: (String) -> String = { """{"lobby":$lobby}""" }) = BucketApi(HttpClient(MockEngine { req ->
        seen += "${req.method.value} ${req.url.encodedPath}?${req.url.encodedQuery} ${(req.body as? TextContent)?.text.orEmpty()}"
        respond(body(req.url.encodedPath), HttpStatusCode.OK)
    }), base = "https://t.local")

    @Test
    fun hostControlsHitTheirRoutes() = runTest {
        val seen = mutableListOf<String>()
        val a = api(seen)
        a.nextGame("t", "L1")
        assertTrue(a.closeLobby("t", "L1").ended)
        a.lobbySettings("t", "L1", game = LobbyGame.Tiles, setup = "sequence", games = listOf("daily", "tiles"))
        a.lobbySettings("t", "L1", guestsWatch = true)
        a.hostMode("t", "L1", screen = true, displayName = null)
        assertTrue(seen[0].startsWith("POST /api/academy/lobbies/next"))
        assertTrue(seen[1].startsWith("POST /api/academy/lobbies/end"))
        assertTrue(seen[2].contains("\"game\":\"tiles\"") && seen[2].contains("\"setup\":\"sequence\"") && seen[2].contains("\"games\":[\"daily\",\"tiles\"]"))
        assertEquals("""POST /api/academy/lobbies/settings? {"lobbyId":"L1","guestsWatch":true}""", seen[3])
        assertTrue(seen[4].endsWith("""{"lobbyId":"L1","screen":true}"""))
    }

    @Test
    fun leaveReadsTheHandoffResult() = runTest {
        val seen = mutableListOf<String>()
        assertEquals(LeaveResult.Handoff, api(seen) { """{"ok":true,"result":"handoff"}""" }.leaveLobby("t", "L1"))
        assertEquals(LeaveResult.Closed, api(seen) { """{"ok":true,"result":"closed"}""" }.leaveLobby("t", "L1"))
        assertEquals(LeaveResult.Left, api(seen) { """{"ok":true}""" }.leaveLobby("t", "L1"))
    }

    @Test
    fun audienceJoinAndBonusVote() = runTest {
        val seen = mutableListOf<String>()
        val a = api(seen) { if (it.endsWith("react")) """{"ok":true}""" else """{"lobby":$lobby}""" }
        a.joinLobby("t", code = "ABC123", displayName = "Ana", audience = true)
        a.bonusVote("t", "L1", 2, "perro")
        assertTrue(seen[0].contains("\"audience\":true"))
        assertTrue(seen[1].endsWith("""{"lobbyId":"L1","round":2,"choice":"perro"}"""))
    }

    @Test
    fun createSendsHostScreenAndSetup() = runTest {
        val seen = mutableListOf<String>()
        api(seen).createLobby("t", "Room", LobbyGame.Daily, "en", listOf("es"), 6, 8, false, "Ana", hostScreen = true, setup = "sequence", games = listOf("daily", "tiles", "same-word"))
        assertTrue(seen[0].contains("\"hostScreen\":true") && seen[0].contains("\"games\":[\"daily\",\"tiles\",\"same-word\"]"))
    }

    @Test
    fun underThirteenCardSendsOnlyTheBand() = runTest {
        val seen = mutableListOf<String>()
        val a = api(seen) { """{"ok":true}""" }
        a.saveCard("t", "L1", PlayerCard(SeatBand.Under13).withSpoken("en", 4).toggleLearn("es"))
        assertEquals(1, seen.size)
        assertTrue(seen[0].endsWith("""{"lobbyId":"L1","band":"under13"}"""))
        a.saveCard("t", "L1", PlayerCard(SeatBand.Adult).withSpoken("en", 4).toggleLearn("es"))
        assertTrue(seen[2].contains(""""card":{"band":"adult","speaks":[{"lang":"en","level":4,"reads":true}],"learn":["es"],"surprise":false}"""))
    }

    @Test
    fun familyReadsDecode() = runTest {
        val seen = mutableListOf<String>()
        val a = api(seen) {
            when {
                it.endsWith("lobby-teach") -> """{"teach":{"round":0,"speakerId":"u2","status":"open","lang":"it","choices":["a","b"],"answer":null,"clip":null,"myGuess":null,"guessed":1,"teacherAward":null}}"""
                it.endsWith("lobby-trivia") -> """{"trivia":{"count":3,"current":0,"open":true,"prompt":"Q","choices":["x","y"],"answer":null,"myPick":null,"picked":0,"questions":null,"scores":{"u1":100}}}"""
                it.endsWith("atlas") -> """{"rounds":[{"clip":0,"form":"ciao","licence":"device-tts"}]}"""
                else -> """{"week":"2026-11-23","tier":2,"tierName":"Silver","board":[{"rank":1,"name":"You","points":40,"me":true}]}"""
            }
        }
        assertEquals("open", a.teach("t", "L1")?.status)
        assertEquals(100, a.trivia("t", "L1")?.scores?.get("u1"))
        assertEquals("ciao", a.atlas("t", "L1").single().form)
        assertEquals("Silver", a.league("t").tierName)
        assertTrue(seen[0].contains("lobbyId=L1"))
    }
}
