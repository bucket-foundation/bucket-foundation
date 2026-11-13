package foundation.bucket.core.auth

import foundation.bucket.core.net.BucketApi
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf

class Fake {
    val calls = mutableListOf<Pair<String, String>>()
    val auth = mutableListOf<String?>()
    var routes: (String, String) -> Pair<Int, String> = { _, _ -> 404 to "{}" }

    val api = BucketApi(HttpClient(MockEngine { req: HttpRequestData ->
        val body = (req.body as? TextContent)?.text ?: ""
        val path = req.url.encodedPath.trimStart('/')
        calls += path to body
        auth += req.headers["authorization"]
        val (status, text) = routes(path, body)
        respond(text, HttpStatusCode.fromValue(status), headersOf("content-type", "application/json"))
    }), base = "https://test.local")
}

fun lobbyJson(id: String = "L1", version: Int = 1, status: String = "lobby", ready: Boolean = false) = """
{"id":"$id","code":"ABC123","name":"Room","game":"daily","root":"en","targets":["es"],"seed":"42","status":"$status","listed":true,
"rounds":3,"roundSeconds":10,"startedAt":"2026-11-12T10:00:00Z","version":$version,"now":"2026-11-12T10:00:00Z","isHost":true,
"players":[{"userId":"u1","name":"Ana","ready":$ready,"score":0,"isHost":true,"isMe":true,"online":true,"answered":false}],
"messages":[],"round":null,"prompts":[{"round":0,"mode":"form","lang":null,"gloss":"eight","choices":["ocho","nueve"],"answer":null}],"results":[],"extra":1}
""".trimIndent()
