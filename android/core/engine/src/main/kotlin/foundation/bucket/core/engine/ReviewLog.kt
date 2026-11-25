package foundation.bucket.core.engine

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.longOrNull

sealed interface LogRow {
    val id: String
    val at: Long
    val device: String
    val tz: String
    val systemId: String

    data class Review(
        override val id: String, override val at: Long, override val device: String, override val tz: String, override val systemId: String,
        val card: String, val rating: Int, val elapsedDays: Double? = null, val sBefore: Double? = null, val sAfter: Double? = null, val d: Double? = null,
    ) : LogRow

    data class Exposure(
        override val id: String, override val at: Long, override val device: String, override val tz: String, override val systemId: String,
        val lang: String, val item: String, val unit: String, val lemmasSeen: List<String>, val taps: List<String>, val seconds: Int, val coveragePred: Double, val completed: Boolean,
    ) : LogRow

    data class Session(
        override val id: String, override val at: Long, override val device: String, override val tz: String, override val systemId: String,
        val lang: String, val sessionId: String, val started: Long, val ended: Long, val shareTarget: Double, val shareReal: Double, val arm: String, val units: Int, val cards: Int,
    ) : LogRow
}

data class CardSummary(val reps: Int, val lapses: Int, val stability: Double?, val difficulty: Double?, val lastReview: Long)

enum class UploadGate { Unknown, Open, Closed }

object ReviewLog {
    const val MAX_LEMMAS = 200
    const val MAX_TAPS = 50
    const val MAX_EXPOSURE_SECONDS = 3600
    const val MAX_SESSION_ITEMS = 1000
    private val LEMMA = Regex("^\\S{1,40}$")
    private val KEY = Regex("^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$")
    private val ARM = Regex("^[a-z0-9_-]{1,32}$")
    private val LANG = Regex("^[a-z]{2,3}$")

    private fun JsonObject.str(k: String, max: Int = 128): String? = (this[k] as? JsonPrimitive)?.takeIf { it.isString }?.content?.takeIf { it.isNotEmpty() && it.length <= max }
    private fun JsonObject.num(k: String): Double? = (this[k] as? JsonPrimitive)?.takeIf { !it.isString }?.doubleOrNull?.takeIf { it.isFinite() }
    private fun JsonObject.long(k: String): Long? = (this[k] as? JsonPrimitive)?.takeIf { !it.isString }?.let { it.longOrNull ?: it.doubleOrNull?.takeIf { d -> d == Math.floor(d) }?.toLong() }
    private fun JsonObject.nat(k: String, max: Int): Int? = long(k)?.takeIf { it in 0..max.toLong() }?.toInt()
    private fun JsonObject.share(k: String): Double? = num(k)?.takeIf { it in 0.0..1.0 }
    private fun JsonObject.pos(k: String): Double? = num(k)?.takeIf { it >= 0 }
    private fun JsonObject.lemmas(k: String, max: Int): List<String>? {
        val a = this[k] as? JsonArray ?: return null
        if (a.size > max) return null
        return a.map { e -> (e as? JsonPrimitive)?.takeIf { it.isString }?.content?.takeIf { LEMMA.matches(it) } ?: return null }
    }

    fun parse(raw: JsonElement?): LogRow? {
        val o = raw as? JsonObject ?: return null
        val id = o.str("review_id") ?: return null
        val device = o.str("device_id", 64) ?: return null
        val tz = o.str("tz", 64) ?: return null
        val system = (o["system_id"] as? JsonPrimitive)?.takeIf { it.isString }?.content ?: return null
        val at = o.long("reviewed_at") ?: return null
        val kind = (o["kind"] as? JsonPrimitive)?.takeIf { it.isString }?.content
        if (o["kind"] != null && kind == null) return null
        when (kind) {
            null, "review" -> {
                val card = o.str("card_id", 256) ?: return null
                val rating = o.long("rating")?.toInt()?.takeIf { it in 1..4 } ?: return null
                o.str("level", 64) ?: return null
                (o["atoms_version"] as? JsonPrimitive)?.takeIf { it.isString } ?: return null
                val m = listOf(o.pos("elapsedDays"), o.pos("S_before"), o.pos("S_after"), o.pos("D"))
                return if (m.all { it != null }) LogRow.Review(id, at, device, tz, system, card, rating, m[0], m[1], m[2], m[3]) else LogRow.Review(id, at, device, tz, system, card, rating)
            }
        }
        val lang = o.str("lang", 3)?.takeIf { LANG.matches(it) } ?: return null
        return when (kind) {
            "exposure" -> {
                val item = o.str("item")?.takeIf { KEY.matches(it) } ?: return null
                val unit = o.str("unit")?.takeIf { KEY.matches(it) } ?: return null
                val seen = o.lemmas("lemmas_seen", MAX_LEMMAS) ?: return null
                val taps = o.lemmas("taps", MAX_TAPS) ?: return null
                val seconds = o.nat("seconds", MAX_EXPOSURE_SECONDS) ?: return null
                val cov = o.share("coverage_pred") ?: return null
                val done = (o["completed"] as? JsonPrimitive)?.takeIf { !it.isString }?.booleanOrNull ?: return null
                LogRow.Exposure(id, at, device, tz, system, lang, item, unit, seen, taps, seconds, cov, done)
            }
            "session" -> {
                val sid = o.str("id") ?: return null
                val started = o.num("started") ?: return null
                val ended = o.num("ended") ?: return null
                if (ended < started) return null
                val target = o.share("share_target") ?: return null
                val real = o.share("share_real") ?: return null
                val arm = o.str("arm", 32)?.takeIf { ARM.matches(it) } ?: return null
                val units = o.nat("units", MAX_SESSION_ITEMS) ?: return null
                val cards = o.nat("cards", MAX_SESSION_ITEMS) ?: return null
                LogRow.Session(id, at, device, tz, system, lang, sid, started.toLong(), ended.toLong(), target, real, arm, units, cards)
            }
            else -> null
        }
    }

    private val order = compareBy<LogRow>({ it.at }, { it.device }, { it.id })

    fun order(rows: List<LogRow>): List<LogRow> {
        val byId = LinkedHashMap<String, LogRow>()
        for (r in rows) {
            val prev = byId[r.id]
            if (prev == null || order.compare(r, prev) < 0) byId[r.id] = r
        }
        return byId.values.sortedWith(order)
    }

    fun replay(raw: List<JsonElement>): Pair<List<String>, Map<String, CardSummary>> {
        val rows = order(raw.mapNotNull(::parse))
        val cards = linkedMapOf<String, CardSummary>()
        for (r in rows) {
            if (r !is LogRow.Review) continue
            val c = cards[r.card] ?: CardSummary(0, 0, null, null, 0)
            cards[r.card] = CardSummary(c.reps + 1, c.lapses + if (r.rating == 1) 1 else 0, r.sAfter ?: c.stability, r.d ?: c.difficulty, r.at)
        }
        return rows.map { it.id } to cards
    }

    fun shareable(rows: List<LogRow>, gate: UploadGate): List<LogRow> = if (gate == UploadGate.Open) rows else rows.filterIsInstance<LogRow.Review>()
}
