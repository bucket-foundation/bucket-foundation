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

    suspend fun learnEvents(token: String, batch: JsonObject): String? = runCatching {
        (json.parseToJsonElement(call("api/academy/event", token, batch, mapper = ::groupError)).jsonObject["outcome"] as? kotlinx.serialization.json.JsonPrimitive)?.content
    }.getOrNull()

    suspend fun experiment(token: String): ExperimentReply? = runCatching {
        ExperimentReply(json.parseToJsonElement(call("api/academy/experiment", token, mapper = ::groupError)).jsonObject["enrolment"]?.takeIf { it is JsonObject }?.toString())
    }.getOrNull()

    suspend fun enrol(token: String, experiment: String, stratum: String): String? = runCatching {
        json.parseToJsonElement(call("api/academy/experiment", token, buildJsonObject { put("experiment", experiment); put("stratum", stratum) }, mapper = ::groupError)).jsonObject["enrolment"]?.takeIf { it is JsonObject }?.toString()
    }.getOrNull()

    suspend fun progressPull(token: String): JsonObject? = runCatching {
        json.parseToJsonElement(call("api/academy/progress", token, mapper = ::groupError)).jsonObject["branches"] as? JsonObject ?: JsonObject(emptyMap())
    }.getOrNull()

    suspend fun progressPush(token: String, branch: String, data: JsonElement, version: String? = null, guarded: Boolean = version != null): PushResult = runCatching {
        call("api/academy/progress", token, buildJsonObject { put("branch", branch); put("data", data); if (guarded) put("version", version) }, mapper = ::groupError)
    }.fold(onSuccess = { PushResult.Written }, onFailure = { e ->
        when {
            e is BucketError.Server && e.status == 409 && e.text == "stale" -> PushResult.Stale
            e is BucketError.Server && e.status == 409 -> PushResult.Refused
            else -> PushResult.Failed
        }
    })

    suspend fun guestTicket(nickname: String, guestId: String): GuestTicket =
        decode(call("api/academy/lobbies/guest", null, buildJsonObject { put("nickname", nickname); put("guestId", guestId) }))

    suspend fun mergeGuest(token: String, guestToken: String): Int =
        json.parseToJsonElement(call("api/academy/lobbies/guest/merge", token, buildJsonObject { put("guestToken", guestToken) })).jsonObject["merged"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 0

    suspend fun lobbies(token: String): LobbiesReply = decode(call("api/academy/lobbies", token, headers = RACE))

    suspend fun raceScore(token: String, lobbyId: String, score: Int): Lobby =
        lobbyCall("api/academy/lobbies/score", token, buildJsonObject { put("lobbyId", lobbyId); put("score", score) })

    suspend fun fillBots(token: String, lobbyId: String): Lobby =
        lobbyCall("api/academy/lobbies/bots", token, buildJsonObject { put("lobbyId", lobbyId) })

    suspend fun createLobby(token: String, name: String, game: LobbyGame, root: String, targets: List<String>, rounds: Int, roundSeconds: Int, listed: Boolean, displayName: String, hostScreen: Boolean = false, setup: String = "single", games: List<String> = emptyList()): Lobby =
        lobbyCall("api/academy/lobbies", token, buildJsonObject {
            put("name", name); put("game", game.wire); put("root", root)
            put("targets", kotlinx.serialization.json.JsonArray(targets.map(::JsonPrimitive)))
            put("rounds", rounds); put("roundSeconds", roundSeconds); put("listed", listed); put("displayName", displayName); put("reveal", true)
            if (hostScreen) put("hostScreen", true)
            if (setup != "single") { put("setup", setup); if (games.isNotEmpty()) put("games", kotlinx.serialization.json.JsonArray(games.map(::JsonPrimitive))) }
        }, RACE)

    suspend fun joinLobby(token: String, code: String? = null, lobbyId: String? = null, displayName: String, audience: Boolean = false): Lobby =
        lobbyCall("api/academy/lobbies/join", token, buildJsonObject {
            put("displayName", displayName)
            if (audience) put("audience", true)
            if (code != null) put("code", code)
            if (lobbyId != null) put("lobbyId", lobbyId)
        }, RACE)

    suspend fun leaveLobby(token: String, lobbyId: String): foundation.bucket.core.model.LeaveResult =
        foundation.bucket.core.model.LeaveResult.of(errorBody(call("api/academy/lobbies/leave", token, buildJsonObject { put("lobbyId", lobbyId) }))["result"])

    suspend fun nextGame(token: String, lobbyId: String): Lobby =
        lobbyCall("api/academy/lobbies/next", token, buildJsonObject { put("lobbyId", lobbyId) })

    suspend fun closeLobby(token: String, lobbyId: String): Lobby =
        lobbyCall("api/academy/lobbies/end", token, buildJsonObject { put("lobbyId", lobbyId) })

    suspend fun lobbySettings(token: String, lobbyId: String, game: LobbyGame? = null, setup: String? = null, games: List<String> = emptyList(), guestsWatch: Boolean? = null): Lobby =
        lobbyCall("api/academy/lobbies/settings", token, buildJsonObject {
            put("lobbyId", lobbyId)
            if (game != null) put("game", game.wire)
            if (setup != null) put("setup", setup)
            if (games.isNotEmpty()) put("games", kotlinx.serialization.json.JsonArray(games.map(::JsonPrimitive)))
            if (guestsWatch != null) put("guestsWatch", guestsWatch)
        })

    suspend fun hostMode(token: String, lobbyId: String, screen: Boolean, displayName: String?): Lobby =
        lobbyCall("api/academy/lobbies/hostmode", token, buildJsonObject {
            put("lobbyId", lobbyId); put("screen", screen)
            if (displayName != null) put("displayName", displayName)
        })

    suspend fun bonusVote(token: String, lobbyId: String, round: Int, choice: String) {
        call("api/academy/lobbies/react", token, buildJsonObject { put("lobbyId", lobbyId); put("round", round); put("choice", choice) })
    }

    suspend fun saveCard(token: String, lobbyId: String, card: foundation.bucket.core.model.PlayerCard) {
        call("api/academy/lobby-cards", token, buildJsonObject { put("lobbyId", lobbyId); put("band", card.band.wire) })
        if (!card.sendsCard) return
        call("api/academy/lobby-cards", token, buildJsonObject {
            put("lobbyId", lobbyId)
            put("card", buildJsonObject {
                put("band", card.band.wire)
                put("speaks", kotlinx.serialization.json.JsonArray(card.speaks.map { s -> buildJsonObject { put("lang", s.lang); put("level", s.level); s.reads?.let { put("reads", it) } } }))
                put("learn", kotlinx.serialization.json.JsonArray(card.learn.map(::JsonPrimitive)))
                put("surprise", card.surprise)
            })
        })
    }

    suspend fun teach(token: String, lobbyId: String): foundation.bucket.core.model.TeachView? =
        decode<foundation.bucket.core.model.TeachReply>(call("api/academy/lobby-teach", token, query = mapOf("lobbyId" to lobbyId))).teach

    suspend fun teachAction(token: String, lobbyId: String, action: String, extra: JsonObject = JsonObject(emptyMap())) {
        call("api/academy/lobby-teach", token, JsonObject(extra + mapOf("lobbyId" to JsonPrimitive(lobbyId), "action" to JsonPrimitive(action))))
    }

    suspend fun trivia(token: String, lobbyId: String): foundation.bucket.core.model.TriviaView? =
        decode<foundation.bucket.core.model.TriviaReply>(call("api/academy/lobby-trivia", token, query = mapOf("lobbyId" to lobbyId))).trivia

    suspend fun triviaAction(token: String, lobbyId: String, action: String, extra: JsonObject = JsonObject(emptyMap())) {
        call("api/academy/lobby-trivia", token, JsonObject(extra + mapOf("lobbyId" to JsonPrimitive(lobbyId), "action" to JsonPrimitive(action))))
    }

    suspend fun atlas(token: String, lobbyId: String): List<foundation.bucket.core.model.AtlasClip> =
        decode<foundation.bucket.core.model.AtlasReply>(call("api/academy/lobbies/atlas", token, query = mapOf("lobbyId" to lobbyId))).rounds

    suspend fun forehead(langs: List<String>, seed: String, root: String): List<foundation.bucket.core.model.ForeheadCard> =
        decode<foundation.bucket.core.model.ForeheadReply>(call("api/academy/forehead", null, query = mapOf("langs" to langs.joinToString(","), "seed" to seed, "root" to root))).cards

    suspend fun foreheadMark(token: String, lobbyId: String, card: Int, got: Boolean) {
        call("api/academy/lobbies/bonus", token, buildJsonObject { put("kind", "forehead"); put("lobbyId", lobbyId); put("card", card); put("got", got) })
    }

    suspend fun league(token: String): foundation.bucket.core.model.LeagueBoard = decode(call("api/academy/league", token))

    suspend fun setReady(token: String, lobbyId: String, ready: Boolean): Lobby =
        lobbyCall("api/academy/lobbies/ready", token, buildJsonObject { put("lobbyId", lobbyId); put("ready", ready) })

    suspend fun startLobby(token: String, lobbyId: String): Lobby =
        lobbyCall("api/academy/lobbies/start", token, buildJsonObject { put("lobbyId", lobbyId) })

    suspend fun chat(token: String, lobbyId: String, body: String): Lobby =
        lobbyCall("api/academy/lobbies/chat", token, buildJsonObject { put("lobbyId", lobbyId); put("body", body) })

    suspend fun power(token: String, lobbyId: String, kind: foundation.bucket.core.model.PowerKind): Lobby =
        lobbyCall("api/academy/lobbies/power", token, buildJsonObject { put("lobbyId", lobbyId); put("kind", kind.wire) })

    suspend fun reportLobbyMessage(token: String, lobbyId: String, messageId: Int, reason: String) {
        call("api/academy/lobbies/report", token, buildJsonObject { put("lobbyId", lobbyId); put("messageId", messageId); put("reason", reason) })
    }

    suspend fun chatBlocks(token: String): List<foundation.bucket.core.model.ChatBlock> =
        decode<foundation.bucket.core.model.ChatBlocksReply>(call("api/academy/lobbies/blocks", token)).blocks

    suspend fun setChatBlock(token: String, userId: String, name: String, blocked: Boolean): List<foundation.bucket.core.model.ChatBlock> =
        decode<foundation.bucket.core.model.ChatBlocksReply>(call("api/academy/lobbies/blocks", token, buildJsonObject { put("userId", userId); put("name", name); put("blocked", blocked) })).blocks

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

    suspend fun trialUsed(token: String): Boolean =
        (kotlinx.serialization.json.Json.parseToJsonElement(call("api/polingual/trial-used", token)) as? JsonObject)?.get("used")?.let { it.toString() == "true" } == true

    suspend fun markTrialUsed(token: String, store: String) {
        call("api/polingual/trial-used", token, JsonObject(mapOf("store" to kotlinx.serialization.json.JsonPrimitive(store))))
    }

    suspend fun playVerify(token: String, packageName: String, productId: String, purchaseToken: String): Boolean =
        (kotlinx.serialization.json.Json.parseToJsonElement(call("api/play/verify", token, JsonObject(mapOf(
            "packageName" to kotlinx.serialization.json.JsonPrimitive(packageName),
            "productId" to kotlinx.serialization.json.JsonPrimitive(productId),
            "purchaseToken" to kotlinx.serialization.json.JsonPrimitive(purchaseToken),
        )))) as? JsonObject)?.get("ok")?.toString() == "true"

    suspend fun deckIndex(): foundation.bucket.core.model.DeckIndex = decode(call("academy-app/corpus/index.json", null))

    suspend fun deck(entry: foundation.bucket.core.model.DeckEntry): foundation.bucket.core.model.Deck = decode(call("academy-app/${entry.file}", null))

    suspend fun canonSearch(query: String, topK: Int = 20): foundation.bucket.core.model.CanonSearch =
        decode(call("api/canon/search", null, query = mapOf("q" to query, "top_k" to topK.toString())))

    private suspend fun lobbyCall(path: String, token: String, body: JsonObject, headers: Map<String, String> = emptyMap()): Lobby = decode<LobbyReply>(call(path, token, body, headers = headers)).lobby

    private val RACE = mapOf(foundation.bucket.core.model.LobbyRace.HEADER to "1", foundation.bucket.core.model.LobbyGames.PLAYS_HEADER to foundation.bucket.core.model.LobbyGames.plays)

    private suspend fun session(body: JsonObject, token: String? = null): String = call("api/academy/session", token, body, mapper = ::sessionError)

    private suspend fun call(
        path: String,
        token: String?,
        body: JsonObject? = null,
        query: Map<String, String> = emptyMap(),
        mapper: (Int, String) -> BucketError = ::groupError,
        headers: Map<String, String> = emptyMap(),
    ): String {
        val url = "${base.trimEnd('/')}/$path"
        val build: HttpRequestBuilder.() -> Unit = {
            if (token != null) header("authorization", "Bearer $token")
            query.toSortedMap().forEach { (k, v) -> parameter(k, v) }
            header("cache-control", "no-cache")
            headers.forEach { (k, v) -> header(k, v) }
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
data class LobbiesReply(val lobbies: List<LobbySummary>, val bots: Boolean = false, val games: List<String> = emptyList(), val race: List<String> = emptyList())

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

enum class PushResult {
    Written, Refused, Stale, Failed;

    val settled: Boolean get() = this == Written || this == Refused
}

data class ExperimentReply(val enrolment: String?)
