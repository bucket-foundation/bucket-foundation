package foundation.bucket.core.data

import foundation.bucket.core.model.LangSystem
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonPrimitive

object SystemsSync {
    const val BRANCH = "lang-systems"

    private fun stamp(o: JsonObject) = (o["updatedAt"] as? JsonPrimitive)?.doubleOrNull ?: (o["createdAt"] as? JsonPrimitive)?.doubleOrNull ?: 0.0

    fun toJson(s: LangSystem): JsonObject = JsonObject(buildMap {
        put("id", JsonPrimitive(s.id)); put("name", JsonPrimitive(s.name)); put("root", JsonPrimitive(s.root))
        put("targets", JsonArray(s.targets.map(::JsonPrimitive))); put("createdAt", JsonPrimitive(s.createdAt))
        s.updatedAt?.let { put("updatedAt", JsonPrimitive(it)) }
        put("placement", JsonObject(s.placement.mapValues { JsonPrimitive(it.value) }))
    })

    fun fromJson(o: JsonObject): LangSystem? {
        val id = (o["id"] as? JsonPrimitive)?.content ?: return null
        return LangSystem(
            id = id,
            name = (o["name"] as? JsonPrimitive)?.content ?: id,
            root = (o["root"] as? JsonPrimitive)?.content ?: "en",
            targets = (o["targets"] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.content }.orEmpty(),
            createdAt = (o["createdAt"] as? JsonPrimitive)?.doubleOrNull ?: 0.0,
            updatedAt = (o["updatedAt"] as? JsonPrimitive)?.doubleOrNull,
            placement = (o["placement"] as? JsonObject)?.mapNotNull { (k, v) -> (v as? JsonPrimitive)?.doubleOrNull?.let { k to it } }?.toMap().orEmpty(),
        )
    }

    fun merge(remote: JsonElement?, local: List<LangSystem>, localRemoved: Map<String, Double>): JsonObject {
        val r = remote as? JsonObject
        val removed = ((r?.get("removed") as? JsonObject)?.mapNotNull { (k, v) -> (v as? JsonPrimitive)?.doubleOrNull?.let { k to it } }?.toMap().orEmpty()).toMutableMap()
        localRemoved.forEach { (k, t) -> removed[k] = maxOf(removed[k] ?: 0.0, t) }
        val order = mutableListOf<String>()
        val byId = mutableMapOf<String, JsonObject>()
        for (o in (r?.get("systems") as? JsonArray).orEmpty().mapNotNull { it as? JsonObject }) {
            val id = o["id"]?.jsonPrimitive?.content ?: continue
            order += id
            byId[id] = o
        }
        for (s in local) {
            val mine = toJson(s)
            val cur = byId[s.id]
            if (cur == null) { order += s.id; byId[s.id] = mine } else if (stamp(mine) > stamp(cur)) byId[s.id] = JsonObject(cur + mine)
        }
        val kept = order.filter { id -> val t = removed[id]; t == null || stamp(byId.getValue(id)) > t }
        return JsonObject(mapOf(
            "systems" to JsonArray(kept.map { byId.getValue(it) }),
            "removed" to JsonObject(removed.toSortedMap().mapValues { JsonPrimitive(it.value) }),
        ))
    }

    fun systems(doc: JsonObject): List<LangSystem> = (doc["systems"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let(::fromJson) }
}
