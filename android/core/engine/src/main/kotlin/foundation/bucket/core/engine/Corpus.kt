package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull

enum class ItemKind { Word, Phrase }

data class Reading(val roman: String? = null, val kana: String? = null, val ipa: String? = null)

data class LangItem(
    val id: String,
    val kind: ItemKind,
    val tier: Double,
    val unit: Int,
    val category: String,
    val gloss: String,
    val forms: Map<String, String>,
    val readings: Map<String, Reading>,
    val root: String?,
    val cognateLangs: List<String>,
    val note: String?,
    val example: Map<String, String>,
) {
    fun form(lang: String): String? = forms[lang]?.takeIf { it.isNotEmpty() }
}

class LangCorpus(val items: List<LangItem>, val attribution: String) {
    val byId: Map<String, LangItem> = items.associateBy { it.id }
}

fun usable(item: LangItem, root: String, lang: String) = item.form(root) != null && item.form(lang) != null

object Units {
    private class Def(val categories: List<String>, val verbTierMax: Double? = null, val verbTierMin: Double? = null)

    private val defs = listOf(
        Def(listOf("number")),
        Def(listOf("ph:greeting", "ph:courtesy")),
        Def(listOf("family", "ph:intro")),
        Def(listOf("color")),
        Def(listOf("food", "ph:dining")),
        Def(listOf("verb"), verbTierMax = 6.0),
        Def(listOf("animal")),
        Def(listOf("body")),
        Def(listOf("adjective", "ph:basics")),
        Def(listOf("object", "ph:shopping")),
        Def(listOf("time", "ph:time")),
        Def(listOf("nature")),
        Def(listOf("verb"), verbTierMin = 7.0),
        Def(listOf("ph:survival", "ph:direction", "ph:smalltalk")),
    )

    val phraseTier = mapOf("greeting" to 1.0, "courtesy" to 1.0, "intro" to 3.0, "basics" to 4.0, "smalltalk" to 5.0, "survival" to 6.0, "dining" to 7.0, "shopping" to 7.0, "direction" to 8.0, "time" to 8.0)

    fun unitFor(category: String, kind: ItemKind, tier: Double): Int {
        val key = if (kind == ItemKind.Phrase) "ph:$category" else category
        val i = defs.indexOfFirst { u -> key in u.categories && (u.verbTierMax == null || tier <= u.verbTierMax) && (u.verbTierMin == null || tier >= u.verbTierMin) }
        return if (i < 0) defs.size - 1 else i
    }
}

object CorpusLoader {
    private val json = Json { ignoreUnknownKeys = true }

    private fun JsonElement?.obj(): JsonObject? = this as? JsonObject
    private fun JsonElement?.str(): String? = (this as? JsonPrimitive)?.takeIf { it.isString }?.contentOrNull
    private fun JsonElement?.num(): Double? = (this as? JsonPrimitive)?.takeIf { !it.isString }?.doubleOrNull
    private fun JsonElement?.truthy(): Boolean = when (this) {
        null -> false
        is JsonPrimitive -> if (isString) content.isNotEmpty() else content != "false" && content != "null" && content != "0"
        else -> true
    }

    private fun strings(v: JsonElement?): Map<String, String> = buildMap {
        v.obj()?.forEach { (k, x) -> x.str()?.let { put(k, it) } }
    }

    fun parse(core: String?, cognates: String?, phrases: String?, layers: String?): LangCorpus {
        val coreJ = core?.let(json::parseToJsonElement)
        val cogJ = cognates?.let(json::parseToJsonElement)
        val phJ = phrases?.let(json::parseToJsonElement)
        val layJ = layers?.let(json::parseToJsonElement)
        val concepts = cogJ.obj()?.get("concepts").obj() ?: JsonObject(emptyMap())
        val fix = layJ.obj()?.get("forms").obj() ?: JsonObject(emptyMap())
        val readingsAll = layJ.obj()?.get("readings").obj()
        val items = mutableListOf<LangItem>()
        for (a in (coreJ.obj()?.get("atoms") as? JsonArray).orEmpty()) {
            val ao = a.obj() ?: continue
            val aid = ao["id"].str() ?: continue
            val c = concepts[aid].obj()
            val forms = linkedMapOf<String, String>()
            ao["forms"].obj()?.forEach { (l, f) -> f.obj()?.get("word").str()?.takeIf { it.isNotEmpty() }?.let { forms[l] = it } }
            fix.forEach { (l, m) -> m.obj()?.get(aid).str()?.takeIf { it.isNotEmpty() }?.let { forms[l] = it } }
            val cognateLangs = (c?.get("cognateLangs") as? JsonArray).orEmpty().mapNotNull { it.str() }.filter { !forms[it].isNullOrEmpty() }
            val tier = ao["tier"].num() ?: 0.0
            val category = ao["category"].str() ?: "word"
            val readings = buildMap {
                readingsAll?.get(aid).obj()?.forEach { (l, r) ->
                    val ro = r.obj()
                    put(l, Reading(ro?.get("roman").str(), ro?.get("kana").str(), ro?.get("ipa").str()))
                }
            }
            items += LangItem(
                id = aid, kind = ItemKind.Word, tier = tier, unit = Units.unitFor(category, ItemKind.Word, tier), category = category,
                gloss = ao["gloss"].str() ?: aid, forms = forms, readings = readings,
                root = if (c?.get("root").truthy() && cognateLangs.size >= 2) c?.get("root").str() else null,
                cognateLangs = if (cognateLangs.size >= 2) cognateLangs else emptyList(),
                note = ao["note"].str(), example = strings(ao["example"]),
            )
        }
        for (p in (phJ.obj()?.get("phrases") as? JsonArray).orEmpty()) {
            val po = p.obj() ?: continue
            val pid = po["id"].str() ?: continue
            val cat = po["category"].str()
            val tier = Units.phraseTier[cat ?: ""] ?: 5.0
            items += LangItem(
                id = "ph-$pid", kind = ItemKind.Phrase, tier = tier, unit = Units.unitFor(cat ?: "", ItemKind.Phrase, tier), category = cat ?: "phrase",
                gloss = po["en"].str() ?: po["forms"].obj()?.get("en").str() ?: pid, forms = strings(po["forms"]), readings = emptyMap(),
                root = null, cognateLangs = emptyList(), note = null, example = emptyMap(),
            )
        }
        val sorted = items.sortedWith(compareBy<LangItem> { it.unit }.thenBy { it.tier }.thenBy { if (it.kind == ItemKind.Word) 0 else 1 })
        val attribution = cogJ.obj()?.get("meta").obj()?.get("attribution").str() ?: "Language data from Wiktionary contributors via Kaikki (kaikki.org), CC-BY-SA 4.0."
        return LangCorpus(sorted, attribution)
    }
}
