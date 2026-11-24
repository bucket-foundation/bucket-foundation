package foundation.bucket.core.auth

import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyPhase
import foundation.bucket.core.model.LobbyStatus
import foundation.bucket.core.model.LobbyClock
import foundation.bucket.core.model.parseInstantMs
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LobbyStoreTest {
    private fun guestStore(f: Fake, kv: MemoryKeyValue = MemoryKeyValue()): LobbyStore {
        val guest = GuestPass(f.api, kv, nickname = { "Ana" }, nowMs = { parseInstantMs("2026-11-12T10:00:00Z")!! })
        return LobbyStore(f.api, userToken = { null }, guest = guest, clock = { parseInstantMs("2026-11-12T10:00:00Z")!! })
    }

    @Test
    fun guestCreatesARoomWithATicket() = runTest {
        val f = Fake()
        f.routes = { path, _ ->
            when (path) {
                "api/academy/lobbies/guest" -> 200 to """{"token":"g1","userId":"guest-1","expiresAt":"2026-11-13T10:00:00Z"}"""
                else -> 200 to """{"lobby":${lobbyJson()}}"""
            }
        }
        val kv = MemoryKeyValue()
        val store = guestStore(f, kv)
        val lobby = store.create("Room", LobbyGame.Daily, "en", listOf("es"), "Ana")
        assertEquals("ABC123", lobby.code)
        assertEquals("Bearer g1", f.auth.last())
        assertTrue("\"game\":\"daily\"" in f.calls.last().second)
        assertTrue("\"targets\":[\"es\"]" in f.calls.last().second)
        assertTrue("\"reveal\":true" in f.calls.last().second)
        assertTrue(kv.get(GuestPass.TICKET_KEY)!!.contains("g1"))
    }

    @Test
    fun joinNormalizesTheCode() = runTest {
        val f = Fake()
        f.routes = { path, _ -> if (path.endsWith("guest")) 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}""" else 200 to """{"lobby":${lobbyJson()}}""" }
        val store = guestStore(f)
        store.join(" abc-123 ", "Ana")
        assertTrue("\"code\":\"ABC123\"" in f.calls.last().second)
    }

    @Test
    fun answerConflictKeepsThePickAndOtherErrorsFreeIt() = runTest {
        val f = Fake()
        var answer = 409 to """{"error":"already_answered"}"""
        f.routes = { path, _ ->
            when {
                path.endsWith("guest") -> 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}"""
                path.endsWith("answer") -> answer
                else -> 200 to """{"lobby":${lobbyJson()}}"""
            }
        }
        val store = guestStore(f)
        store.join("ABC123", "Ana")
        assertNull(store.pick("ocho", 0))
        assertEquals("ocho", store.state.value.picks[0])
        answer = 500 to """{"error":"oops"}"""
        assertNull(store.pick("x", 1))
        assertNull(store.state.value.picks[1])
        answer = 200 to """{"correct":true,"points":900,"ms":800,"lobby":${lobbyJson(version = 2)}}"""
        assertEquals(true, store.pick("ocho", 2))
        assertEquals(true, store.state.value.marks[2])
        assertEquals(2, store.state.value.current?.version)
    }

    @Test
    fun pollAppliesChangesAndDropsAGoneRoom() = runTest {
        val f = Fake()
        var state = 200 to """{"changed":true,"lobby":${lobbyJson(version = 5, ready = true)},"now":"2026-11-12T10:00:02Z"}"""
        f.routes = { path, _ ->
            when {
                path.endsWith("guest") -> 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}"""
                path.endsWith("state") -> state
                else -> 200 to """{"lobby":${lobbyJson()}}"""
            }
        }
        val store = guestStore(f)
        store.join("ABC123", "Ana")
        store.poll()
        assertEquals(5, store.state.value.current?.version)
        assertEquals(2000, store.state.value.offsetMs)
        state = 404 to """{"error":"not_found"}"""
        store.poll()
        assertNull(store.state.value.current)
    }

    @Test
    fun clockPhases() {
        val lobby = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }.decodeFromString(foundation.bucket.core.model.Lobby.serializer(), lobbyJson(status = "playing"))
        val start = parseInstantMs("2026-11-12T10:00:00Z")!!
        assertEquals(LobbyPhase.Countdown(3.0), LobbyClock.phase(lobby, start - 3000))
        assertEquals(LobbyPhase.Round(1, 5.0), LobbyClock.phase(lobby, start + 15000))
        assertEquals(LobbyPhase.Finished, LobbyClock.phase(lobby, start + 31000))
        assertEquals(LobbyPhase.Waiting, LobbyClock.phase(lobby.copy(status = LobbyStatus.Lobby), start))
    }

    @Test
    fun guestMergesOnSignIn() = runTest {
        val f = Fake()
        f.routes = { path, _ -> if (path.endsWith("merge")) 200 to """{"merged":3}""" else 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}""" }
        val kv = MemoryKeyValue()
        val guest = GuestPass(f.api, kv, nickname = { "Ana" }, nowMs = { 0 })
        guest.token()
        val store = LobbyStore(f.api, userToken = { "user" }, guest = guest)
        store.mergeGuest()
        assertTrue("\"guestToken\":\"g1\"" in f.calls.last().second)
        assertNull(kv.get(GuestPass.TICKET_KEY))
    }

    @Test
    fun revealSlotsSitBetweenRounds() {
        val base = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }.decodeFromString(foundation.bucket.core.model.Lobby.serializer(), lobbyJson(status = "playing"))
        val lobby = base.copy(revealSeconds = 4)
        val start = parseInstantMs("2026-11-12T10:00:00Z")!!
        assertEquals(LobbyPhase.Round(0, 2.0), LobbyClock.phase(lobby, start + 8000))
        assertEquals(LobbyPhase.Reveal(0, 2.0), LobbyClock.phase(lobby, start + 12000))
        assertEquals(LobbyPhase.Round(1, 10.0), LobbyClock.phase(lobby, start + 14000))
        assertEquals(LobbyPhase.Finished, LobbyClock.phase(lobby, start + 42000))
    }

    @Test
    fun decodesBotsHandlesAndReveal() {
        val json = lobbyJson().replace("\"answered\":false}", "\"answered\":false,\"handle\":\"ana\",\"bot\":true,\"skill\":\"easy\",\"flag\":\"es\"}")
            .replace("\"answer\":null}", "\"answer\":\"ocho\",\"reveal\":[{\"lang\":\"es\",\"word\":\"ocho\",\"roman\":null,\"reading\":null,\"meaning\":\"eight\",\"gloss\":\"eight\",\"correct\":true}]}")
            .replace("\"results\":[]", "\"results\":[],\"botsEnabled\":true,\"revealSeconds\":4")
        val lobby = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }.decodeFromString(foundation.bucket.core.model.Lobby.serializer(), json)
        assertTrue(lobby.players.single().bot)
        assertEquals("es", lobby.players.single().flag)
        assertEquals("ocho", lobby.prompts.single().reveal.single().word)
        assertTrue(lobby.botsEnabled)
        assertEquals(4, lobby.revealSeconds)
    }

    @Test
    fun hostFillsBots() = runTest {
        val f = Fake()
        f.routes = { path, _ -> if (path.endsWith("guest")) 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}""" else 200 to """{"lobby":${lobbyJson(version = 3)}}""" }
        val store = guestStore(f)
        store.join("ABC123", "Ana")
        store.fillBots()
        assertEquals("api/academy/lobbies/bots", f.calls.last().first)
        assertEquals(3, store.state.value.current?.version)
    }

    @Test
    fun listReadsTheBotsFlag() = runTest {
        val f = Fake()
        f.routes = { path, _ -> if (path.endsWith("guest")) 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}""" else 200 to """{"lobbies":[{"id":"L1","code":"ABC123","name":"Room","game":"tiles","root":"en","targets":["es"],"status":"lobby","players":2,"bots":1,"standing":true,"host":"Ana","hostHandle":null,"isMember":false}],"bots":true}""" }
        val store = guestStore(f)
        store.refresh()
        assertTrue(store.state.value.botsEnabled)
        assertEquals(foundation.bucket.core.model.LobbyGame.Tiles, store.state.value.open.single().game)
    }

    @Test
    fun interstitialPacing() {
        val p = foundation.bucket.core.model.InterstitialPacer
        assertEquals(false, p.due(true, null, 1, 0))
        assertEquals(true, p.due(true, null, 2, 0))
        assertEquals(false, p.due(true, 0, 3, 100_000))
        assertEquals(true, p.due(true, 0, 3, 180_000))
        assertEquals(false, p.due(false, null, 5, 0))
    }

    @Test
    fun duelPowerPostsTheKindAndDecodesCoinsPowersAndHiddenChoices() = runTest {
        val f = Fake()
        val duel = lobbyJson().replace("\"game\":\"daily\"", "\"game\":\"duel\"")
            .replace("\"answer\":null}", "\"answer\":null,\"hide\":[\"nueve\"]},{\"round\":1,\"mode\":\"meaning\",\"lang\":\"es\",\"gloss\":\"perro\",\"choices\":[\"dog\",\"cat\"],\"answer\":null}")
            .replace("\"extra\":1", "\"extra\":1,\"coins\":3,\"powers\":[{\"round\":1,\"kind\":\"double\"}]")
        f.routes = { path, _ -> if (path.endsWith("guest")) 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}""" else 200 to """{"lobby":$duel}""" }
        val store = guestStore(f)
        store.join("ABC123", "Ana")
        store.power(foundation.bucket.core.model.PowerKind.Fifty)
        assertEquals("api/academy/lobbies/power", f.calls.last().first)
        assertTrue("\"kind\":\"fifty\"" in f.calls.last().second)
        val l = store.state.value.current!!
        assertEquals(LobbyGame.Duel, l.game)
        assertEquals(3, l.coins)
        assertTrue(l.doubled(1))
        assertEquals(listOf("nueve"), l.prompt(0)!!.hide)
        assertEquals(foundation.bucket.core.model.LobbyPromptMode.Meaning, l.prompt(1)!!.mode)
    }
}
