package foundation.bucket.core.data

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.StudyState
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.longOrNull

object StudySync {
    data class Remote(val data: JsonElement?, val version: String?)

    enum class Outcome { Saved, Stale, Failed }

    suspend fun settle(local: StudyState, pull: suspend () -> Remote?, push: suspend (JsonObject, String?) -> Outcome, tries: Int = 3): JsonObject? {
        repeat(tries) {
            val remote = pull() ?: return null
            if (remote.data == null && local.cards.isEmpty()) return JsonObject(emptyMap())
            val merged = merge(remote.data, local)
            if (merged == remote.data) return merged
            when (push(merged, remote.version)) {
                Outcome.Saved -> return merged
                Outcome.Failed -> return null
                Outcome.Stale -> Unit
            }
        }
        return null
    }

    fun branch(systemId: String): String = "lang-sys-$systemId".take(64)

    private fun num(o: JsonObject?, k: String): Double? = (o?.get(k) as? JsonPrimitive)?.doubleOrNull

    private fun lastReview(o: JsonObject?): Long = num(o, "lastReview")?.toLong() ?: 0L

    fun cardJson(c: CardState): JsonObject = JsonObject(buildMap {
        put("state", JsonPrimitive(if (c.reps == 0 && c.lapses == 0) "new" else if (c.intervalDays == 0.0) "relearning" else "review"))
        put("stability", JsonPrimitive(c.intervalDays))
        put("scheduledDays", JsonPrimitive(c.intervalDays))
        put("due", JsonPrimitive(c.due))
        put("lastReview", JsonPrimitive(c.last))
        put("reps", JsonPrimitive(c.reps))
        put("lapses", JsonPrimitive(c.lapses))
    })

    fun card(o: JsonObject): CardState = CardState(
        reps = (o["reps"] as? JsonPrimitive)?.intOrNull ?: 0,
        lapses = (o["lapses"] as? JsonPrimitive)?.intOrNull ?: 0,
        intervalDays = num(o, "scheduledDays") ?: num(o, "stability") ?: 0.0,
        due = (o["due"] as? JsonPrimitive)?.longOrNull ?: num(o, "due")?.toLong() ?: 0L,
        last = lastReview(o),
    )

    fun localWins(c: CardState, theirs: JsonObject?): Boolean {
        if (theirs == null) return true
        val mine = listOf(c.reps.toDouble(), c.last.toDouble(), c.lapses.toDouble(), c.due.toDouble())
        val other = listOf(num(theirs, "reps") ?: 0.0, num(theirs, "lastReview") ?: 0.0, num(theirs, "lapses") ?: 0.0, num(theirs, "due") ?: 0.0)
        for (i in mine.indices) if (mine[i] != other[i]) return mine[i] > other[i]
        return false
    }

    fun merge(remote: JsonElement?, local: StudyState): JsonObject {
        val r = remote as? JsonObject ?: JsonObject(emptyMap())
        val remoteCards = r["cards"] as? JsonObject ?: JsonObject(emptyMap())
        val cards = remoteCards.toMutableMap()
        local.cards.forEach { (id, c) ->
            val theirs = remoteCards[id] as? JsonObject
            if (localWins(c, theirs)) cards[id] = JsonObject(theirs.orEmpty() + cardJson(c))
        }
        val stats = r["stats"] as? JsonObject ?: JsonObject(emptyMap())
        val history = (stats["history"] as? JsonObject)?.toMutableMap() ?: mutableMapOf()
        local.days.forEach { d ->
            val h = history[d] as? JsonObject
            val reviews = num(h, "reviews") ?: 0.0
            if (h == null || reviews < 1) history[d] = JsonObject((h.orEmpty()) + mapOf("new" to (h?.get("new") ?: JsonPrimitive(0)), "reviews" to JsonPrimitive(maxOf(reviews, 1.0).toInt())))
        }
        val lastDay = listOfNotNull((stats["lastStudyDay"] as? JsonPrimitive)?.content?.takeIf { it != "null" }, local.days.maxOrNull()).maxOrNull()
        val newStats = stats + mapOf(
            "xp" to (stats["xp"] ?: JsonPrimitive(0)),
            "streak" to JsonPrimitive(maxOf(num(stats, "streak")?.toInt() ?: 0, local.streak)),
            "history" to JsonObject(history),
        ) + (lastDay?.let { mapOf("lastStudyDay" to JsonPrimitive(it)) } ?: emptyMap())
        return JsonObject(r + mapOf("cards" to JsonObject(cards), "stats" to JsonObject(newStats)))
    }

    fun state(merged: JsonObject, local: StudyState): StudyState {
        val cards = (merged["cards"] as? JsonObject)?.mapNotNull { (id, v) -> (v as? JsonObject)?.let { id to card(it) } }?.toMap().orEmpty()
        val days = ((merged["stats"] as? JsonObject)?.get("history") as? JsonObject)?.keys.orEmpty() + local.days
        return local.copy(cards = cards, days = days.toSortedSet().toList())
    }
}
