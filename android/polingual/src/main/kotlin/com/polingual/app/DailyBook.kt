package com.polingual.app

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer

@Serializable
data class DailyWord(val lang: String, val itemId: String, val form: String, val gloss: String, val right: Boolean)

@Serializable
data class DailyResult(val game: String, val day: String, val score: Int, val total: Int, val pattern: String, val savedAt: Long, val words: List<DailyWord> = emptyList())

enum class DailyGame(val wire: String) { DailySet("daily-set"), Mini("mini"), WordGroups("word-groups"), SpeedMatch("speed-match"), WhichVoice("which-voice"), LetterSprint("letter-sprint") }

fun GameKind.daily(): DailyGame? = when (this) {
    GameKind.Daily -> DailyGame.DailySet
    GameKind.Mini -> DailyGame.Mini
    GameKind.WordGroups -> DailyGame.WordGroups
    GameKind.Match -> DailyGame.SpeedMatch
    GameKind.Voice -> DailyGame.WhichVoice
    GameKind.Letters -> DailyGame.LetterSprint
    else -> null
}

fun dayKey(date: java.time.LocalDate = java.time.LocalDate.now()): String = "${date.year}-${date.monthValue}-${date.dayOfMonth}"

interface ProgressRemote {
    suspend fun pull(): Map<String, DailyResult>?
    suspend fun push(book: Map<String, DailyResult>): Boolean
}

object DailyBook {
    const val BRANCH = "polingual-daily"
    const val LOCAL_KEY = "polingual/daily/v1"
    const val KEEP = 120
    private val json = Json { ignoreUnknownKeys = true }
    private val book = MapSerializer(String.serializer(), DailyResult.serializer())

    fun key(game: DailyGame, day: String) = "${game.wire}|$day"

    private fun earlier(x: DailyResult?, y: DailyResult?): DailyResult? = when {
        x == null -> y
        y == null -> x
        y.savedAt < x.savedAt -> y
        else -> x
    }

    fun merge(a: Map<String, DailyResult>, b: Map<String, DailyResult>): Map<String, DailyResult> {
        val all = (a.keys + b.keys).associateWith { earlier(a[it], b[it])!! }
        return all.entries.sortedByDescending { it.value.savedAt }.take(KEEP).associate { it.key to it.value }
    }

    fun same(a: Map<String, DailyResult>, b: Map<String, DailyResult>): Boolean =
        a.size == b.size && a.all { (k, v) -> b[k]?.let { it.savedAt == v.savedAt && it.pattern == v.pattern } == true }

    fun decode(raw: String?): Map<String, DailyResult> = raw?.let { runCatching { json.decodeFromString<Map<String, DailyResult>>(it) }.getOrNull() } ?: emptyMap()

    fun encode(book: Map<String, DailyResult>): String = json.encodeToString(book)

    fun fromBranches(branches: JsonObject): Map<String, DailyResult> =
        (branches[BRANCH] as? JsonObject)?.get("data")?.jsonObject?.get("results")?.let { runCatching { json.decodeFromJsonElement(book, it) }.getOrNull() } ?: emptyMap()

    fun branchData(results: Map<String, DailyResult>): JsonElement = buildJsonObject { put("results", json.encodeToJsonElement(book, results)) }

    suspend fun sync(remote: ProgressRemote, local: Map<String, DailyResult>, tries: Int = 3): Map<String, DailyResult>? {
        var book = local
        repeat(tries) {
            val theirs = remote.pull() ?: return null
            book = merge(book, theirs)
            if (same(book, theirs)) return book
            if (!remote.push(book)) return@repeat
            val check = remote.pull()
            if (check != null && same(merge(book, check), check)) return merge(book, check)
            if (check != null) book = merge(book, check)
        }
        return null
    }
}
