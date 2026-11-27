package foundation.bucket.core.auth

import foundation.bucket.core.model.LeaveResult
import foundation.bucket.core.model.parseInstantMs
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LobbyFamilyStoreTest {
    private fun store(f: Fake) = LobbyStore(f.api, userToken = { "u" }, guest = null, clock = { parseInstantMs("2026-11-12T10:00:00Z")!! })

    @Test
    fun autoNextGameClearsPicksFromTheLastGame() = runTest {
        val f = Fake()
        var state = """{"changed":true,"lobby":${lobbyJson(version = 2, status = "playing")}}"""
        f.routes = { path, _ ->
            when {
                path.endsWith("answer") -> 200 to """{"correct":true,"lobby":${lobbyJson(version = 2, status = "playing")}}"""
                path.endsWith("state") -> 200 to state
                else -> 200 to """{"lobby":${lobbyJson(status = "playing")}}"""
            }
        }
        val s = store(f)
        s.join("ABC123", "Ana")
        s.pick("ocho", 0)
        state = """{"changed":true,"lobby":${lobbyJson(version = 3, status = "done")}}"""
        s.poll()
        assertEquals("ocho", s.state.value.picks[0])
        state = """{"changed":true,"lobby":${lobbyJson(version = 4, status = "playing", startedAt = "2026-11-12T10:02:00Z")}}"""
        s.poll()
        assertTrue(s.state.value.picks.isEmpty())
        assertTrue(s.state.value.marks.isEmpty())
    }

    @Test
    fun hostOnlyActionsSkipForPlayers() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 200 to """{"lobby":${lobbyJson().replace("\"now\":\"2026-11-12T10:00:00Z\",\"isHost\":true", "\"now\":\"2026-11-12T10:00:00Z\",\"isHost\":false")}}""" }
        val s = store(f)
        s.join("ABC123", "Ana")
        val before = f.calls.size
        s.nextGame(); s.close(); s.settings(guestsWatch = true); s.hostMode(true, null)
        assertEquals(before, f.calls.size)
    }

    @Test
    fun leaveReportsHandoffAndVoteHoldsOnConflict() = runTest {
        val f = Fake()
        var react = 409 to """{"error":"already_voted"}"""
        f.routes = { path, _ ->
            when {
                path.endsWith("leave") -> 200 to """{"ok":true,"result":"handoff"}"""
                path.endsWith("react") -> react
                else -> 200 to """{"lobby":${lobbyJson(status = "playing")}}"""
            }
        }
        val s = store(f)
        s.join("ABC123", "Ana")
        assertFalse(s.vote(2, "a"))
        assertEquals("a", s.state.value.votes[2])
        react = 500 to "{}"
        assertFalse(s.vote(1, "b"))
        assertNull(s.state.value.votes[1])
        assertEquals(LeaveResult.Handoff, s.leave())
        assertNull(s.state.value.current)
        assertEquals(LeaveResult.Handoff, s.state.value.left)
    }
}
