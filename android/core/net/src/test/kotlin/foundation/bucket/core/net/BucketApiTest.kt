package foundation.bucket.core.net

import foundation.bucket.core.model.BucketError
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class BucketApiTest {
    private fun api(status: Int, body: String, seen: MutableList<String> = mutableListOf()) = BucketApi(HttpClient(MockEngine { req ->
        seen += "${req.method.value} ${req.url.encodedPath}?${req.url.encodedQuery} ${(req.body as? TextContent)?.text.orEmpty()}"
        respond(body, HttpStatusCode.fromValue(status))
    }), base = "https://t.local")

    @Test
    fun sessionErrorTable() {
        assertEquals(BucketError.BadEmail, sessionError(400, """{"error":"bad_email"}"""))
        assertEquals(BucketError.BadCode, sessionError(400, """{"error":"bad_code"}"""))
        assertEquals(BucketError.Revoked, sessionError(401, "{}"))
        assertEquals(BucketError.RateLimited(null), sessionError(429, "{}"))
        assertEquals(BucketError.Unavailable, sessionError(503, "{}"))
        assertEquals(BucketError.Server(502, null), sessionError(502, """{"error":"delete_failed"}"""))
    }

    @Test
    fun groupErrorTable() {
        assertEquals(BucketError.NotFound, groupError(404, "{}"))
        assertEquals(BucketError.RoomFull, groupError(409, """{"error":"group_full"}"""))
        assertEquals(BucketError.Server(409, "already_answered"), groupError(409, """{"error":"already_answered"}"""))
        assertEquals(BucketError.NameNotAllowed, groupError(422, """{"error":"name_not_allowed"}"""))
        assertEquals(BucketError.Server(500, "not json"), groupError(500, "not json").let { if (it is BucketError.Server) BucketError.Server(500, "not json") else it })
    }

    @Test
    fun progressPushSendsBranchAndData() = runTest {
        val seen = mutableListOf<String>()
        assertTrue(api(200, "{}", seen).progressPush("t", "lang-systems", JsonPrimitive(1)))
        assertEquals("""POST /api/academy/progress? {"branch":"lang-systems","data":1}""", seen.single())
    }

    @Test
    fun progressPushReportsFailure() = runTest {
        assertEquals(false, api(503, """{"error":"sync_unavailable"}""").progressPush("t", "x", JsonPrimitive(1)))
    }

    @Test
    fun profileReadsMeAndMapsTakenHandles() = runTest {
        val seen = mutableListOf<String>()
        val p = api(200, """{"profile":{"handle":"ana","displayName":"Ana","isPublic":false,"url":"/m/ana"},"preview":{}}""", seen).profile("t")
        assertEquals("Ana", p?.displayName)
        assertTrue(seen.single().startsWith("GET /api/academy/profile?me=1"))
        assertEquals("That username is taken. Try another.", assertFailsWith<BucketError.Server> { api(409, """{"error":"handle_taken"}""").saveProfile("t", "ana", null) }.message)
    }

    @Test
    fun undecodableReplyIsDecodingError() = runTest {
        assertFailsWith<BucketError.Decoding> { api(200, "<html>").verify("a@b.co", "123456") }
    }
}

class ScienceApiTest {
    @Test
    fun readsDeckIndexAndDeck() = kotlinx.coroutines.test.runTest {
        val seen = mutableListOf<String>()
        val api = BucketApi(HttpClient(MockEngine { req ->
            seen += req.url.encodedPath + "?" + req.url.encodedQuery
            when {
                req.url.encodedPath.endsWith("index.json") -> respond("""{"${'$'}comment":"x","version":"1.0.0","decks":[{"id":"02-physics","file":"corpus/physics.json","pill":"02 · Physics","sub":"Laws"}]}""", HttpStatusCode.OK)
                req.url.encodedPath.endsWith("search") -> respond("""{"query":"entropy","results":[{"claim_id":7,"branch":"02","concept":"entropy","title":"Second law","url":null,"excerpt":"Heat flows","evidence_count":3}]}""", HttpStatusCode.OK)
                else -> respond("""{"meta":{"branch":"02","title":"Physics"},"atoms":[{"id":"newton-2","title":"Newton's second law","summary":"F = ma","depths":{"deep":"d","eli5":"e"},"quiz":[{"level":"recall","prompt":"F?","answer":"ma"}],"leverage":2}]}""", HttpStatusCode.OK)
            }
        }), base = "https://t.local", app = "bucket")
        val index = api.deckIndex()
        assertEquals("Physics", index.decks.single().title)
        assertEquals("02", index.decks.single().mark)
        val deck = api.deck(index.decks.single())
        assertEquals(listOf("eli5", "deep"), deck.atoms.single().orderedDepths.map { it.first })
        assertEquals("ma", deck.atoms.single().quiz.single().answer)
        assertEquals(3, api.canonSearch("entropy").results.single().evidenceCount)
        assertTrue(seen.last().contains("q=entropy") && seen.last().contains("top_k=20"))
        assertEquals("/academy-app/corpus/physics.json?", seen[1])
    }

}
