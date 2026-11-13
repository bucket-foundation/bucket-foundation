package foundation.bucket.core.net

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.GuestTicket
import foundation.bucket.core.model.Lobby
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbySummary
import foundation.bucket.core.model.Profile
import foundation.bucket.core.model.Session
import io.ktor.client.HttpClient
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

class BucketApi(
    private val client: HttpClient,
    val base: String = PRODUCTION,
    val app: String = "polingual",
) {
    val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    suspend fun requestCode(email: String) {
        session(buildJsonObject { put("action", "otp"); put("email", email); put("app", app) })
    }

    suspend fun verify(email: String, code: String): Session =
        decode(session(buildJsonObject { put("action", "verify"); put("email", email); put("code", code) }))

    suspend fun refresh(s: Session): Session =
        decode(session(buildJsonObject { put("action", "refresh"); put("refresh_token", s.refreshToken) }))

    suspend fun deleteAccount(token: String) {
        session(buildJsonObject { put("action", "delete_account") }, token)
    }

    suspend fun profile(token: String): Profile? {
        val text = call("api/academy/profile", token, query = mapOf("me" to "1"), mapper = ::groupError)
        return json.parseToJsonElement(text).jsonObject["profile"]?.takeIf { it is JsonObject }?.let { json.decodeFromJsonElement(Profile.serializer(), it) }
    }

    suspend fun saveProfile(token: String, handle: String?, displayName: String?): Profile {
        val body = buildJsonObject {
            if (handle != null) put("handle", handle)
            if (displayName != null) put("display_name", displayName)
        }
        val text = call("api/academy/profile", token, body, mapper = ::profileError)
        return json.decodeFromJsonElement(Profile.serializer(), json.parseToJsonElement(text).jsonObject.getValue("profile"))
    }

    suspend fun progressPull(token: String): JsonObject? = runCatching {
        json.parseToJsonElement(call("api/academy/progress", token, mapper = ::groupError)).jsonObject["branches"] as? JsonObject ?: JsonObject(emptyMap())
    }.getOrNull()

    suspend fun progressPush(token: String, branch: String, data: JsonElement): Boolean = runCatching {
        call("api/academy/progress", token, buildJsonObject { put("branch", branch); put("data", data) }, mapper = ::groupError)
    }.isSuccess

    suspend fun guestTicket(nickname: String, guestId: String): GuestTicket =
        decode(call("api/academy/lobbies/guest", null, buildJsonObject { put("nickname", nickname); put("guestId", guestId) }))

    suspend fun mergeGuest(token: String, guestToken: String): Int =
        json.parseToJsonElement(call("api/academy/lobbies/guest/merge", token, buildJsonObject { put("guestToken", guestToken) })).jsonObject["merged"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 0

    suspend fun lobbies(token: String): LobbiesReply = decode(call("api/academy/lobbies", token))

    suspend fun fillBots(token: String, lobbyId: String): Lobby =
        lobbyCall("api/academy/lobbies/bots", token, buildJsonObject { put("lobbyId", lobbyId) })

    suspend fun createLobby(token: String, name: String, game: LobbyGame, root: String, targets: List<String>, rounds: Int, roundSeconds: Int, listed: Boolean, displayName: String): Lobby =
        lobbyCall("api/academy/lobbies", token, buildJsonObject {
            put("name", name); put("game", game.wire); put("root", root)
            put("targets", kotlinx.serialization.json.JsonArray(targets.map(::JsonPrimitive)))
            put("rounds", rounds); put("roundSeconds", roundSeconds); put("listed", listed); put("displayName", displayName)
        })

    suspend fun joinLobby(token: String, code: String? = null, lobbyId: String? = null, displayName: String): Lobby =
        lobbyCall("api/academy/lobbies/join", token, buildJsonObject {
            put("displayName", displayName)
            if (code != null) put("code", code)
            if (lobbyId != null) put("lobbyId", lobbyId)
        })

    suspend fun leaveLobby(token: String, lobbyId: String) {
        call("api/academy/lobbies/leave", token, buildJsonObject { put("lobbyId", lobbyId) })
    }

    suspend fun setReady(token: String, lobbyId: String, ready: Boolean): Lobby =
        lobbyCall("api/academy/lobbies/ready", token, buildJsonObject { put("lobbyId", lobbyId); put("ready", ready) })

    suspend fun startLobby(token: String, lobbyId: String): Lobby =
        lobbyCall("api/academy/lobbies/start", token, buildJsonObject { put("lobbyId", lobbyId) })

    suspend fun chat(token: String, lobbyId: String, body: String): Lobby =
        lobbyCall("api/academy/lobbies/chat", token, buildJsonObject { put("lobbyId", lobbyId); put("body", body) })

    suspend fun answer(token: String, lobbyId: String, round: Int, choice: String): AnswerReply =
        decode(call("api/academy/lobbies/answer", token, buildJsonObject { put("lobbyId", lobbyId); put("round", round); put("choice", choice) }))

    suspend fun lobbyState(token: String, lobbyId: String, since: Int?): LobbyPoll {
        val q = buildMap { put("lobbyId", lobbyId); if (since != null) put("since", since.toString()) }
        return decode(call("api/academy/lobbies/state", token, query = q))
    }

    suspend fun reportTranslation(token: String?, body: JsonObject) {
        call("api/academy/translation-report", token, body)
    }

    suspend fun raw(path: String): String = call(path, null)

    suspend fun deckIndex(): foundation.bucket.core.model.DeckIndex = decode(call("academy-app/corpus/index.json", null))

    suspend fun deck(entry: foundation.bucket.core.model.DeckEntry): foundation.bucket.core.model.Deck = decode(call("academy-app/${entry.file}", null))

    suspend fun canonSearch(query: String, topK: Int = 20): foundation.bucket.core.model.CanonSearch =
        decode(call("api/canon/search", null, query = mapOf("q" to query, "top_k" to topK.toString())))

    private suspend fun lobbyCall(path: String, token: String, body: JsonObject): Lobby = decode<LobbyReply>(call(path, token, body)).lobby

    private suspend fun session(body: JsonObject, token: String? = null): String = call("api/academy/session", token, body, mapper = ::sessionError)

    private suspend fun call(
        path: String,
        token: String?,
        body: JsonObject? = null,
        query: Map<String, String> = emptyMap(),
        mapper: (Int, String) -> BucketError = ::groupError,
    ): String {
        val url = "${base.trimEnd('/')}/$path"
        val build: HttpRequestBuilder.() -> Unit = {
            if (token != null) header("authorization", "Bearer $token")
            query.toSortedMap().forEach { (k, v) -> parameter(k, v) }
            header("cache-control", "no-cache")
            if (body != null) {
                contentType(ContentType.Application.Json)
                setBody(body.toString())
            }
        }
        val response: HttpResponse = try {
            if (body != null) client.post(url, build) else client.get(url, build)
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            throw BucketError.Offline
        }
        val text = response.bodyAsText()
        if (response.status.value !in 200..299) throw mapper(response.status.value, text)
        return text
    }

    inline fun <reified T> decode(text: String): T = try {
        json.decodeFromString<T>(text)
    } catch (e: kotlinx.serialization.SerializationException) {
        throw BucketError.Decoding
    } catch (e: IllegalArgumentException) {
        throw BucketError.Decoding
    }

    companion object {
        const val PRODUCTION = "https://www.bucket.foundation"
    }
}

@Serializable
data class LobbyReply(val lobby: Lobby)

@Serializable
data class LobbiesReply(val lobbies: List<LobbySummary>, val bots: Boolean = false)

@Serializable
data class AnswerReply(val correct: Boolean, val lobby: Lobby)

@Serializable
data class LobbyPoll(val changed: Boolean, val lobby: Lobby? = null, val now: String? = null)

internal fun errorBody(text: String): Map<String, String> = runCatching {
    Json.parseToJsonElement(text).jsonObject.mapNotNull { (k, v) -> (v as? JsonPrimitive)?.takeIf { it.isString }?.let { k to it.content } }.toMap()
}.getOrDefault(emptyMap())

fun sessionError(status: Int, text: String): BucketError {
    val body = errorBody(text)
    return when {
        status == 400 && body["error"] == "bad_email" -> BucketError.BadEmail
        status == 400 && body["error"] == "bad_code" -> BucketError.BadCode
        status == 401 -> BucketError.Revoked
        status == 429 -> BucketError.RateLimited(body["message"])
        status == 503 -> BucketError.Unavailable
        else -> BucketError.Server(status, body["message"])
    }
}

fun groupError(status: Int, text: String): BucketError {
    val body = errorBody(text)
    val error = body["error"]
    return when {
        status == 401 -> BucketError.Revoked
        status == 404 -> BucketError.NotFound
        status == 409 && (error == "group_full" || error == "lobby_full") -> BucketError.RoomFull
        status == 409 && error == "update_app" -> BucketError.Server(status, "This room plays a game this version does not have yet. Update Polingual or play on the web.")
        status == 409 && error == "lobby_started" -> BucketError.Server(status, "That game already started.")
        status == 422 && error == "name_not_allowed" -> BucketError.NameNotAllowed
        status == 422 && error == "text_not_allowed" -> BucketError.TextNotAllowed
        status == 429 -> BucketError.RateLimited(body["message"])
        else -> BucketError.Server(status, body["message"] ?: error)
    }
}

fun profileError(status: Int, text: String): BucketError {
    val body = errorBody(text)
    return when (body["error"]) {
        "handle_taken" -> BucketError.Server(status, "That username is taken. Try another.")
        "invalid_handle" -> BucketError.Server(status, body["message"] ?: "Usernames are 3 to 32 lowercase letters, numbers, - or _.")
        else -> groupError(status, text)
    }
}
