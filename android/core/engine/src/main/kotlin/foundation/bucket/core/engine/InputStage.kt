package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.text.Normalizer
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

data class InputToken(val surface: String, val lemma: String)

data class InputMedia(val videoId: String, val start: Double, val end: Double)

data class InputItem(val id: String, val kind: String, val tokens: List<InputToken>, val text: String, val translation: String?, val translationSource: String?, val media: InputMedia?)

data class InputUnit(val id: String, val kind: String, val itemIds: List<String>, val targetLemmas: List<String>)

data class InputBundle(val lang: String, val items: List<InputItem>, val units: List<InputUnit>) {
    val byId: Map<String, InputItem> = items.associateBy { it.id }
    fun lemmas(u: InputUnit): List<String> = u.itemIds.flatMap { id -> byId[id]?.tokens.orEmpty().map { it.lemma } }
}

data class StageChoice(val unit: InputUnit, val items: List<InputItem>, val plan: InputPlan, val fallback: Boolean)

data class Viewing(val taps: Map<String, List<String>> = emptyMap(), val seenMs: Map<String, Double> = emptyMap(), val revealed: Set<String> = emptySet())

data class ExposureInput(
    val item: String,
    val unit: String,
    val lemmasSeen: List<String>,
    val taps: List<String>,
    val seconds: Int,
    val coveragePred: Double,
    val completed: Boolean,
    val revealed: Boolean,
    val playback: String? = null,
)

object InputStage {
    const val MAX_EXPOSURE_SECONDS = 3600
    private val LEMMA = Regex("^\\S{1,40}$")

    private fun JsonObject.s(k: String): String? = (this[k] as? JsonPrimitive)?.takeIf { it.isString }?.content

    fun parseBundle(text: String): InputBundle? = runCatching {
        val o = Json.parseToJsonElement(text).jsonObject
        if (o.s("format") != "polingual-input") return null
        val items = o["items"]!!.jsonArray.map { e ->
            val i = e.jsonObject
            val m = i["media"] as? JsonObject
            InputItem(
                i.s("id")!!, i.s("kind") ?: "sentence",
                i["tokens"]!!.jsonArray.map { t -> InputToken(t.jsonObject.s("surface")!!, t.jsonObject.s("lemma")!!) },
                i.s("text") ?: "", i.s("translation"), i.s("translationSource"),
                m?.let { InputMedia(it.s("videoId")!!, it["start"]!!.jsonPrimitive.doubleOrNull!!, it["end"]!!.jsonPrimitive.doubleOrNull!!) },
            )
        }
        val units = o["units"]!!.jsonArray.map { e ->
            val u = e.jsonObject
            InputUnit(u.s("id")!!, u.s("kind")!!, u["itemIds"]!!.jsonArray.map { it.jsonPrimitive.content }, (u["targetLemmas"] as? JsonArray)?.map { it.jsonPrimitive.content }.orEmpty())
        }
        InputBundle(o.s("lang")!!, items, units)
    }.getOrNull()

    private fun key(s: String) = Normalizer.normalize(s, Normalizer.Form.NFC).lowercase().trim()

    fun lemmaCardMap(corpus: LangCorpus, lang: String): Map<String, String> {
        val out = linkedMapOf<String, String>()
        corpus.items.filter { it.kind == ItemKind.Word && it.form(lang) != null }.sortedWith(compareBy<LangItem> { it.tier }.thenBy { it.id }).forEach {
            val k = key(it.forms.getValue(lang))
            if (k.isNotEmpty() && k !in out) out[k] = "$lang:${it.id}"
        }
        return out
    }

    fun resolver(maps: Map<String, Map<String, String>>): (String, String) -> String? = { lang, lemma -> maps[lang]?.get(key(lemma)) }

    fun known(card: CardState?): Double = if (card == null || card.reps == 0) 0.0 else 1 - exp(-card.intervalDays / 21.0)

    fun learner(state: StudyState, lang: String, resolve: (String, String) -> String?, now: Long, shown: Map<String, Int>, lastVideo: String?): InputLearner {
        val card = { lemma: String -> resolve(lang, lemma)?.let { state.cards[it] } }
        val due = state.cards.filter { (id, c) -> id.startsWith("$lang:") && c.due <= now }.keys
        return InputLearner({ known(card(it)) }, due.map { it.substringAfter(':') }.toSet(), { null }, shown, lastVideo)
    }

    fun plans(b: InputBundle, l: InputLearner): List<InputPlan> = b.units.map { u ->
        InputSelector.plan(u.id, b.lemmas(u), u.targetLemmas, u.kind == "episode", u.itemIds.firstOrNull()?.let { b.byId[it]?.media?.videoId }, l)
    }

    fun choose(b: InputBundle, l: InputLearner, allowFallback: Boolean): StageChoice? {
        val byId = b.units.associateBy { it.id }
        val (plan, fallback) = InputSelector.select(plans(b, l), l) { b.lemmas(byId.getValue(it)) } ?: return null
        if (fallback && !allowFallback) return null
        val unit = byId.getValue(plan.unit)
        return StageChoice(unit, unit.itemIds.mapNotNull { b.byId[it] }, plan, fallback)
    }

    fun eligibleUnitSeconds(b: InputBundle, l: InputLearner): List<Double> = plans(b, l).filter { it.eligible }.map { it.tokens * 1.5 }

    fun toggleTap(v: Viewing, item: String, lemma: String): Viewing {
        val cur = v.taps[item].orEmpty()
        return v.copy(taps = v.taps + (item to if (lemma in cur) cur - lemma else cur + lemma))
    }

    fun addSeen(v: Viewing, visible: List<String>, ms: Double): Viewing {
        if (ms <= 0 || visible.isEmpty()) return v
        val share = ms / visible.size
        val seen = v.seenMs.toMutableMap()
        for (id in visible) seen[id] = (seen[id] ?: 0.0) + share
        return v.copy(seenMs = seen)
    }

    fun reveal(v: Viewing, item: String): Viewing = v.copy(revealed = v.revealed + item)

    private fun round(x: Double): Long = Math.floor(x + 0.5).toLong()

    fun present(v: Viewing, visible: List<String>): Viewing = v.copy(seenMs = v.seenMs + visible.filter { it !in v.seenMs }.associateWith { 0.0 })

    fun exposureRows(choice: StageChoice, v: Viewing, completed: Boolean, playerUnavailable: Boolean = false): List<ExposureInput> = choice.items.mapNotNull { item ->
        val ms = v.seenMs[item.id] ?: return@mapNotNull null
        if (ms <= 0 && !playerUnavailable) return@mapNotNull null
        val lemmas = item.tokens.map { it.lemma }.filter { LEMMA.matches(it) }.distinct().take(200)
        ExposureInput(
            item.id, choice.unit.id, lemmas,
            v.taps[item.id].orEmpty().distinct().filter { LEMMA.matches(it) }.take(50),
            min(MAX_EXPOSURE_SECONDS.toLong(), max(0L, round(ms / 1000))).toInt(),
            round(min(1.0, max(0.0, choice.plan.coverage)) * 1e4) / 1e4,
            completed, item.id in v.revealed,
            if (playerUnavailable && item.media != null) "unavailable" else null,
        )
    }

    fun logRow(e: ExposureInput, lang: String, id: String, at: Long, device: String, tz: String, systemId: String): LogRow.Exposure =
        LogRow.Exposure(id, at, device, tz, systemId, lang, e.item, e.unit, e.lemmasSeen, e.taps, e.seconds, e.coveragePred, e.completed, e.revealed, e.playback)
}
