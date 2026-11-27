package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ReviewLogTest {
    private val vectors = Json.parseToJsonElement(File(System.getProperty("reviewLogVectors")).readText()).jsonObject

    private fun num(e: JsonElement?): Double? = if (e == null || e is JsonNull) null else e.jsonPrimitive.doubleOrNull

    @Test
    fun goldenVectorsMatchTheWebReplay() {
        val cases = vectors["cases"]!!.jsonArray
        assertTrue(cases.size >= 5)
        for (c in cases) {
            val o = c.jsonObject
            val name = o["name"]!!.jsonPrimitive.content
            val (accepted, cards) = ReviewLog.replay(o["rows"]!!.jsonArray)
            val expect = o["expect"]!!.jsonObject
            assertEquals(expect["accepted"]!!.jsonArray.map { it.jsonPrimitive.content }, accepted, name)
            val want = expect["cards"]!!.jsonObject
            assertEquals(want.keys, cards.keys, name)
            for ((id, w) in want) {
                val x = w.jsonObject
                val got = cards.getValue(id)
                assertEquals(x["reps"]!!.jsonPrimitive.longOrNull!!.toInt(), got.reps, "$name $id reps")
                assertEquals(x["lapses"]!!.jsonPrimitive.longOrNull!!.toInt(), got.lapses, "$name $id lapses")
                assertEquals(num(x["stability"]), got.stability, "$name $id stability")
                assertEquals(num(x["difficulty"]), got.difficulty, "$name $id difficulty")
                assertEquals(x["lastReview"]!!.jsonPrimitive.longOrNull, got.lastReview, "$name $id lastReview")
            }
        }
    }

    @Test
    fun shareableKeepsOnlyReviewsUntilTheGateOpens() {
        val rows = vectors["cases"]!!.jsonArray[1].jsonObject["rows"]!!.jsonArray.mapNotNull(ReviewLog::parse)
        assertEquals(4, rows.size)
        assertEquals(1, ReviewLog.shareable(rows, UploadGate.Unknown).size)
        assertEquals(0, ReviewLog.shareable(rows, UploadGate.Closed).size)
        assertEquals(4, ReviewLog.shareable(rows, UploadGate.Open).size)
    }

    @Test
    fun deviceHashMatchesTheWeb() {
        for (v in vectors["deviceHash"]!!.jsonArray) {
            val o = v.jsonObject
            assertEquals(o["hash"]!!.jsonPrimitive.content, ReviewLog.deviceHash(o["salt"]!!.jsonPrimitive.content, o["device"]!!.jsonPrimitive.content))
        }
    }

    @Test
    fun exposureLimitsHoldAtTheEdges() {
        fun exp(seconds: Int, lemmas: Int) = JsonObject(mapOf(
            "review_id" to JsonPrimitive("e"), "reviewed_at" to JsonPrimitive(1), "device_id" to JsonPrimitive("d"), "tz" to JsonPrimitive("UTC"), "system_id" to JsonPrimitive("s"),
            "kind" to JsonPrimitive("exposure"), "lang" to JsonPrimitive("es"), "item" to JsonPrimitive("i"), "unit" to JsonPrimitive("u"),
            "lemmas_seen" to JsonArray((0 until lemmas).map { JsonPrimitive("w$it") }), "taps" to JsonArray(emptyList()),
            "seconds" to JsonPrimitive(seconds), "coverage_pred" to JsonPrimitive(0.9), "completed" to JsonPrimitive(true),
        ))
        assertTrue(ReviewLog.parse(exp(3600, 200)) is LogRow.Exposure)
        assertEquals(null, ReviewLog.parse(exp(3601, 1)))
        assertEquals(null, ReviewLog.parse(exp(1, 201)))
    }
}
