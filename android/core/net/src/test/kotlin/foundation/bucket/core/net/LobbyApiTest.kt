package foundation.bucket.core.net

import foundation.bucket.core.model.BucketError
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class LobbyApiTest {
    private fun api(status: Int, body: String, seen: MutableList<String> = mutableListOf()) = BucketApi(HttpClient(MockEngine { req ->
        seen += "${req.method.value} ${req.url.encodedPath} ${(req.body as? TextContent)?.text.orEmpty()}"
        respond(body, HttpStatusCode.fromValue(status))
    }), base = "https://t.local")

    @Test
    fun duelPowerRoundTripsThroughTheFakeApi() = runTest {
        val seen = mutableListOf<String>()
        val lobby = """{"id":"L1","code":"ABC123","name":"Room","game":"duel","root":"en","targets":["es"],"seed":"42","status":"playing","listed":true,"rounds":10,"roundSeconds":8,"version":4,"now":"2026-11-12T10:00:00Z","isHost":true,"players":[],"messages":[],"prompts":[{"round":1,"mode":"meaning","lang":"es","gloss":"perro","choices":["dog","cat","sun"],"answer":null,"hide":["sun"]}],"results":[],"coins":1,"powers":[{"round":1,"kind":"fifty"}]}"""
        val reply = api(200, """{"lobby":$lobby}""", seen).power("tok", "L1", foundation.bucket.core.model.PowerKind.Fifty)
        assertTrue(seen.single().startsWith("POST /api/academy/lobbies/power"))
        assertTrue("\"lobbyId\":\"L1\"" in seen.single() && "\"kind\":\"fifty\"" in seen.single())
        assertEquals(1, reply.coins)
        assertEquals(foundation.bucket.core.model.PowerKind.Fifty, reply.powerFor(1)?.kind)
        assertEquals(listOf("sun"), reply.prompt(1)!!.hide)
        val noCoins = api(409, """{"error":"no_coins"}""")
        assertFailsWith<BucketError> { noCoins.power("tok", "L1", foundation.bucket.core.model.PowerKind.Double) }
    }

    @Test
    fun lobbiesReplyCarriesTheServerGameList() = runTest {
        val r = api(200, """{"lobbies":[],"bots":true,"games":["daily","duel","spy"]}""").lobbies("tok")
        assertEquals(listOf("daily", "duel", "spy"), r.games)
    }
}
