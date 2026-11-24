package foundation.bucket.core.auth

import foundation.bucket.core.model.ChatReportReason
import foundation.bucket.core.model.LobbyMessage
import foundation.bucket.core.model.parseInstantMs
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import foundation.bucket.core.model.BucketError
import kotlin.test.assertTrue

class ChatModerationTest {
    private fun msg(id: Int, from: String) = LobbyMessage(id, from, from, "hi $id", "2026-11-12T10:00:00Z")

    private class Server {
        val f = Fake()
        val lists = mutableMapOf<String, MutableSet<String>>()
        var down = false
        val reject = mutableSetOf<String>()
        val names = mutableListOf<String>()
        init {
            f.routes = { _, body ->
                val who = f.auth.last()?.removePrefix("Bearer ").orEmpty()
                val set = lists.getOrPut(who) { mutableSetOf() }
                val target = Regex("\"userId\":\"([^\"]+)\"").find(body)?.groupValues?.get(1)
                Regex("\"name\":\"([^\"]+)\"").find(body)?.groupValues?.get(1)?.let { names += it }
                if (down) 503 to "{}" else if (target in reject) 400 to """{"error":"bad_user"}""" else {
                    Regex("\"userId\":\"([^\"]+)\"").find(body)?.groupValues?.get(1)?.let { id ->
                        if ("\"blocked\":true" in body) set += id else set -= id
                    }
                    200 to set.joinToString(",", """{"blocks":[""", "]}") { """{"userId":"$it","name":"P"}""" }
                }
            }
        }
    }

    private class Who(var id: String?) {
        val identity: suspend () -> ChatIdentity? = { id?.let { ChatIdentity(it, "t-$it") } }
    }

    @Test
    fun blockHidesMessagesAndSurvivesARestart() = runTest {
        val kv = MemoryKeyValue()
        val s = Server()
        val who = Who("a")
        val blocks = ChatBlocks(kv, s.f.api, who.identity)
        blocks.block("troll", "Troll")
        val messages = listOf(msg(1, "ana"), msg(2, "troll"), msg(3, "ana"))
        assertEquals(listOf(1, 3), blocks.visible(messages).map { it.id })
        s.down = true
        val again = ChatBlocks(kv, s.f.api, who.identity)
        again.sync()
        assertEquals(setOf("troll"), again.blocked.value)
        s.down = false
        blocks.unblock("troll")
        assertEquals(3, blocks.visible(messages).size)
    }

    @Test
    fun secondAccountOnTheSameDeviceStartsWithItsOwnBlocks() = runTest {
        val kv = MemoryKeyValue()
        val s = Server()
        val who = Who("a")
        val blocks = ChatBlocks(kv, s.f.api, who.identity)
        blocks.block("troll", "Troll")
        who.id = "b"
        blocks.sync()
        assertEquals(emptySet<String>(), blocks.blocked.value)
        assertEquals(emptySet<String>(), s.lists["t-b"].orEmpty())
        assertEquals<Set<String>?>(setOf("troll"), s.lists["t-a"])
        who.id = "a"
        blocks.sync()
        assertEquals(setOf("troll"), blocks.blocked.value)
    }

    @Test
    fun unblockOnWebWinsOnTheNextSync() = runTest {
        val kv = MemoryKeyValue()
        val s = Server()
        val blocks = ChatBlocks(kv, s.f.api, Who("a").identity)
        blocks.block("troll", "Troll")
        s.lists["t-a"]!!.remove("troll")
        blocks.sync()
        assertEquals(emptySet<String>(), blocks.blocked.value)
        assertEquals(emptySet<String>(), s.lists["t-a"].orEmpty())
    }

    @Test
    fun offlineBlockIsQueuedAndSentOnSync() = runTest {
        val kv = MemoryKeyValue()
        val s = Server()
        val blocks = ChatBlocks(kv, s.f.api, Who("a").identity)
        s.down = true
        blocks.block("third", "T")
        assertEquals(setOf("third"), blocks.blocked.value)
        s.down = false
        blocks.sync()
        assertEquals<Set<String>?>(setOf("third"), s.lists["t-a"])
        assertEquals(setOf("third"), blocks.blocked.value)
    }

    @Test
    fun rejectedQueuedOpIsDroppedAndTheServerListStillWins() = runTest {
        val kv = MemoryKeyValue()
        val s = Server()
        val blocks = ChatBlocks(kv, s.f.api, Who("a").identity)
        s.down = true
        blocks.block("ghost", "Ghost")
        blocks.block("troll", "Troll")
        s.down = false
        s.reject += "ghost"
        s.lists.getOrPut("t-a") { mutableSetOf() } += "web"
        blocks.sync()
        assertEquals(setOf("troll", "web"), blocks.blocked.value)
        assertEquals(null, kv.get(ChatBlocks.pendingKey("a")))
        blocks.sync()
        assertEquals(setOf("troll", "web"), blocks.blocked.value)
    }

    @Test
    fun replayKeepsTheBlockedPlayersName() = runTest {
        val s = Server()
        val blocks = ChatBlocks(MemoryKeyValue(), s.f.api, Who("a").identity)
        s.down = true
        blocks.block("troll", "Troll")
        s.down = false
        s.names.clear()
        blocks.sync()
        assertEquals(listOf("Troll"), s.names)
    }

    @Test
    fun queuedBlockStaysHiddenAfterAnOnlineBlock() = runTest {
        val s = Server()
        val blocks = ChatBlocks(MemoryKeyValue(), s.f.api, Who("a").identity)
        s.down = true
        blocks.block("first", "F")
        s.down = false
        blocks.block("second", "S")
        assertEquals(setOf("first", "second"), blocks.blocked.value)
    }

    @Test
    fun rejectedOnlineBlockIsRolledBack() = runTest {
        val kv = MemoryKeyValue()
        val s = Server()
        val blocks = ChatBlocks(kv, s.f.api, Who("a").identity)
        s.reject += "ghost"
        blocks.block("ghost", "Ghost")
        assertEquals(emptySet<String>(), blocks.blocked.value)
        assertEquals(null, kv.get(ChatBlocks.pendingKey("a")))
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

    @Test
    fun failedReportThrowsSoTheDialogCanShowIt() = runTest {
        val f = Fake()
        f.routes = { path, _ ->
            when (path) {
                "api/academy/lobbies/guest" -> 200 to """{"token":"g1","userId":"guest-1","expiresAt":"2026-11-13T10:00:00Z"}"""
                "api/academy/lobbies/report" -> 429 to """{"error":"rate_limited"}"""
                else -> 200 to """{"lobby":${lobbyJson()}}"""
            }
        }
        val guest = GuestPass(f.api, MemoryKeyValue(), nickname = { "Ana" }, nowMs = { parseInstantMs("2026-11-12T10:00:00Z")!! })
        val store = LobbyStore(f.api, userToken = { null }, guest = guest, clock = { parseInstantMs("2026-11-12T10:00:00Z")!! })
        store.join("ABC123", "Ana")
        assertFailsWith<BucketError> { store.report(42, ChatReportReason.Spam) }
    }
}
