package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class ExposureReplayTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("exposureVectors")).readText()).jsonObject

    private fun d(o: JsonObject, k: String): Double? = (o[k] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.doubleOrNull
    private fun s(o: JsonObject, k: String): String? = (o[k] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content

    @Test
    fun goldenVectorsMatchTheWeb() {
        for (c in v["cases"]!!.jsonArray) {
            val o = c.jsonObject
            val name = o["name"]!!.jsonPrimitive.content
            val start = o["card"]!!.jsonObject
            var card: ExposureCard? = ExposureCard(s(start, "state")!!, d(start, "stability"), d(start, "lastReview"), d(start, "due"), s(start, "exposureDay"))
            for (step in o["steps"]!!.jsonArray) {
                val st = step.jsonObject
                val tapped = st["tapped"]!!.jsonArray.map { it.jsonPrimitive.booleanOrNull!! }
                card = ExposureReplay.group(card, tapped, st["at"]!!.jsonPrimitive.double, st["day"]!!.jsonPrimitive.content, st["alpha"]!!.jsonPrimitive.double)
                val e = st["expect"]!!.jsonObject
                assertEquals(d(e, "stability"), card!!.stability, "$name stability")
                assertEquals(d(e, "due"), card.due, "$name due")
                assertEquals(d(e, "lastReview"), card.lastReview, "$name lastReview")
                assertEquals(s(e, "exposureDay"), card.exposureDay, "$name exposureDay")
            }
        }
    }

    @Test
    fun alphaDefaultsToZeroAndGainIsCapped() {
        assertEquals(0.0, ExposureReplay.ALPHA)
        assertEquals(0.15, ExposureReplay.gain(9.0))
        assertEquals(0.0, ExposureReplay.gain(-1.0))
    }
}
