package foundation.bucket.core.auth

import foundation.bucket.core.model.ChatReportReason
import foundation.bucket.core.model.LobbyMessage
import foundation.bucket.core.model.parseInstantMs
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ChatModerationTest {
    private fun msg(id: Int, from: String) = LobbyMessage(id, from, from, "hi $id", "2026-11-12T10:00:00Z")

    @Test
    fun blockHidesMessagesAndSurvivesARestart() {
        val kv = MemoryKeyValue()
        val blocks = ChatBlocks(kv)
        blocks.block("troll")
        val messages = listOf(msg(1, "ana"), msg(2, "troll"), msg(3, "ana"))
        assertEquals(listOf(1, 3), blocks.visible(messages).map { it.id })
        assertEquals(setOf("troll"), ChatBlocks(kv).blocked.value)
        blocks.unblock("troll")
        assertEquals(3, ChatBlocks(kv).visible(messages).size)
    }

    @Test
    fun reportSendsTheMessageAndReason() = runTest {
        val f = Fake()
        f.routes = { path, _ ->
            when (path) {
                "api/academy/lobbies/guest" -> 200 to """{"token":"g1","userId":"guest-1","expiresAt":"2026-11-13T10:00:00Z"}"""
                "api/academy/lobbies/report" -> 200 to """{"ok":true}"""
                else -> 200 to """{"lobby":${lobbyJson()}}"""
            }
        }
        val guest = GuestPass(f.api, MemoryKeyValue(), nickname = { "Ana" }, nowMs = { parseInstantMs("2026-11-12T10:00:00Z")!! })
        val store = LobbyStore(f.api, userToken = { null }, guest = guest, clock = { parseInstantMs("2026-11-12T10:00:00Z")!! })
        store.join("ABC123", "Ana")
        store.report(42, ChatReportReason.Harassment)
        val (path, body) = f.calls.last()
        assertTrue(path.endsWith("api/academy/lobbies/report"), path)
        assertTrue("\"messageId\":42" in body && "\"reason\":\"harassment\"" in body, body)
    }
}
