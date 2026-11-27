package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class InputSelectorTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("selectorVectors")).readText()).jsonObject

    private fun strings(e: kotlinx.serialization.json.JsonElement?) = e!!.jsonArray.map { it.jsonPrimitive.content }

    @Test
    fun goldenVectorsMatchTheWeb() {
        val units = v["units"]!!.jsonArray.map { it.jsonObject }.associateBy { it["id"]!!.jsonPrimitive.content }
        for (c in v["cases"]!!.jsonArray) {
            val o = c.jsonObject
            val name = o["name"]!!.jsonPrimitive.content
            val lo = o["learner"]!!.jsonObject
            val p = lo["p"]!!.jsonObject.mapValues { it.value.jsonPrimitive.double }
            val rank = lo["rank"]!!.jsonObject.mapValues { it.value.jsonPrimitive.double }
            val l = InputLearner({ p[it] ?: 0.0 }, strings(lo["due"]).toSet(), { rank[it] }, lo["recent"]!!.jsonObject.mapValues { it.value.jsonPrimitive.int },
                lo["lastVideo"].takeIf { it !is JsonNull }?.jsonPrimitive?.content)
            val chosen = strings(o["units"]).toSet()
            val plans = units.keys.filter { it in chosen }.map { id ->
                val u = units.getValue(id)
                InputSelector.plan(id, strings(u["lemmas"]), strings(u["targets"]), u["media"]!!.jsonPrimitive.booleanOrNull!!, u["video"].takeIf { it !is JsonNull }?.jsonPrimitive?.content, l)
            }
            plans.zip(o["plans"]!!.jsonArray.map { it.jsonObject }).forEach { (got, e) ->
                assertEquals(e["tokens"]!!.jsonPrimitive.int, got.tokens, "$name ${got.unit}")
                assertEquals(strings(e["newWords"]), got.newWords, "$name ${got.unit} new")
                assertEquals(strings(e["glossed"]), got.glossed, "$name ${got.unit} glossed")
                assertEquals(e["eligible"]!!.jsonPrimitive.booleanOrNull, got.eligible, "$name ${got.unit} eligible")
                assertTrue(abs(e["coverage"]!!.jsonPrimitive.double - got.coverage) < 1e-8, "$name ${got.unit} coverage")
                assertTrue(abs(e["score"]!!.jsonPrimitive.double - got.score) < 1e-8, "$name ${got.unit} score")
            }
            val pick = InputSelector.select(plans, l) { strings(units.getValue(it)["lemmas"]) }
            val want = o["selected"] as? JsonObject
            assertEquals(want?.get("unit")?.jsonPrimitive?.content, pick?.first?.unit, name)
            if (want != null) {
                assertEquals(want["fallback"]!!.jsonPrimitive.booleanOrNull, pick!!.second, name)
                assertEquals(strings(want["glossed"]), pick.first.glossed, name)
                assertEquals(strings(want["newWords"]), pick.first.newWords, name)
            }
        }
    }
}
