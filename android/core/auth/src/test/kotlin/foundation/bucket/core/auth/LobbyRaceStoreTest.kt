package foundation.bucket.core.auth

import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.parseInstantMs
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LobbyRaceStoreTest {
    private fun store(f: Fake) = LobbyStore(f.api, userToken = { "u" }, guest = null, clock = { parseInstantMs("2026-11-12T10:00:05Z")!! })

    @Test
    fun theListAsksForRaceGamesAndKeepsWhatTheServerReturns() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 200 to """{"lobbies":[],"bots":false,"games":["daily","spy"],"race":["flag-tiles","mini"]}""" }
        val s = store(f)
        s.refresh()
        assertEquals("1", f.race.last())
        assertEquals(listOf("flag-tiles", "mini"), s.state.value.race)
    }

    @Test
    fun createAndJoinSendTheRaceHeader() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 200 to """{"lobby":${lobbyJson(game = "shift")}}""" }
        val s = store(f)
        s.create("Room", LobbyGame.Shift, "en", listOf("es"), "Ana")
        assertEquals("1", f.race.last())
        s.join("abc123", "Ana")
        assertEquals("1", f.race.last())
        assertEquals(LobbyGame.Shift, s.state.value.current?.game)
    }

    @Test
    fun aFinishedRacePostsOneScoreAndRetriesAfterAServerFault() = runTest {
        val f = Fake()
        var fail = true
        f.routes = { path, _ ->
            when (path) {
                "api/academy/lobbies/score" -> if (fail) { fail = false; 503 to """{"error":"busy"}""" } else 200 to """{"score":700,"lobby":${lobbyJson(status = "playing", game = "flag-tiles")}}"""
                "api/academy/lobbies/state" -> 200 to """{"changed":false}"""
                else -> 200 to """{"lobby":${lobbyJson(status = "playing", game = "flag-tiles")}}"""
            }
        }
        val s = store(f)
        s.join("ABC123", "Ana")
        assertFalse(s.postScore(700))
        assertEquals(700, s.state.value.raceScore)
        assertFalse(s.state.value.raceScoreSent)
        s.poll()
        assertTrue(s.state.value.raceScoreSent)
        assertEquals(2, f.calls.count { it.first == "api/academy/lobbies/score" })
        assertTrue("\"score\":700" in f.calls.last { it.first == "api/academy/lobbies/score" }.second)
        assertTrue(s.postScore(900))
        assertEquals(700, s.state.value.raceScore)
        assertEquals(2, f.calls.count { it.first == "api/academy/lobbies/score" })
    }

    @Test
    fun aPromptGameNeverPostsARaceScore() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 200 to """{"lobby":${lobbyJson(status = "playing")}}""" }
        val s = store(f)
        s.join("ABC123", "Ana")
        assertFalse(s.postScore(500))
        assertTrue(f.calls.none { it.first == "api/academy/lobbies/score" })
    }

    @Test
    fun androidRefusesToHostARaceItCannotPlay() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 200 to """{"lobby":${lobbyJson(game = "mini")}}""" }
        val s = store(f)
        val e = kotlin.runCatching { s.create("Room", LobbyGame.Mini, "en", listOf("es"), "Ana") }.exceptionOrNull()
        assertEquals(foundation.bucket.core.model.BucketError.Server(409, LobbyStore.UNPLAYABLE), e)
        assertTrue(f.calls.isEmpty())
    }

    @Test
    fun aScoreRefusedWith401Or404IsNotRetried() = runTest {
        for (status in listOf(401, 404)) {
            val f = Fake()
            f.routes = { path, _ ->
                when (path) {
                    "api/academy/lobbies/score" -> status to """{"error":"x"}"""
                    "api/academy/lobbies/state" -> 200 to """{"changed":false}"""
                    else -> 200 to """{"lobby":${lobbyJson(status = "playing", game = "flag-tiles")}}"""
                }
            }
            val s = store(f)
            s.join("ABC123", "Ana")
            assertFalse(s.postScore(300))
            assertTrue(s.state.value.raceScoreSent, "status $status")
            if (status == 401) s.poll()
            assertEquals(1, f.calls.count { it.first == "api/academy/lobbies/score" }, "status $status")
        }
    }
}
