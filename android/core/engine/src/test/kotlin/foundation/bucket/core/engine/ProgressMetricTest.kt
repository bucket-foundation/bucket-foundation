package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class ProgressMetricTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("progressMetricVectors")).readText()).jsonObject
    private val now = v["now"]!!.jsonPrimitive.double

    private fun row(o: JsonObject): MetricRow {
        fun d(k: String) = (o[k] as? JsonPrimitive)?.doubleOrNull
        fun s(k: String) = (o[k] as? JsonPrimitive)?.content
        fun l(k: String) = (o[k] as? JsonArray)?.map { it.jsonPrimitive.content } ?: emptyList()
        return MetricRow(s("kind"), s("lang"), d("reviewed_at")!!, s("tz"), d("seconds"), d("coverage_pred"), d("started"), d("ended"), l("lemmas_seen"), l("taps"))
    }

    private fun rows(o: JsonObject) = o["rows"]!!.jsonArray.map { row(it.jsonObject) }

    @Test
    fun goldenRows() {
        for (c in v["rows"]!!.jsonArray) {
            val o = c.jsonObject
            val lang = o["lang"]!!.jsonPrimitive.content
            val e = o["expect"]!!.jsonObject
            val name = o["name"]!!.jsonPrimitive.content
            assertEquals(e["inputSeconds"]!!.jsonPrimitive.double, ProgressMetric.inputSeconds(rows(o), lang), name)
            assertEquals(e["inputDays"]!!.jsonArray.map { it.jsonPrimitive.content }, ProgressMetric.inputDays(rows(o), lang), name)
        }
    }

    @Test
    fun goldenStreak() {
        for (c in v["streak"]!!.jsonArray) {
            val o = c.jsonObject
            val e = o["expect"]!!.jsonObject
            val got = ProgressMetric.streakFromDays(o["days"]!!.jsonArray.map { it.jsonPrimitive.content }, o["today"]!!.jsonPrimitive.content)
            assertEquals(InputStreak(e["streak"]!!.jsonPrimitive.int, e["studiedToday"]!!.jsonPrimitive.boolean), got, o["name"]!!.jsonPrimitive.content)
        }
    }

    @Test
    fun goldenMetrics() {
        for (c in v["metrics"]!!.jsonArray) {
            val o = c.jsonObject
            val cards = o["cards"]!!.jsonObject.mapValues { (_, x) ->
                val m = x.jsonObject
                MetricCard((m["stability"] as? JsonPrimitive)?.doubleOrNull, (m["lastReview"] as? JsonPrimitive)?.doubleOrNull)
            }
            val e = o["expect"]!!.jsonObject
            val got = ProgressMetric.langMetrics(o["lang"]!!.jsonPrimitive.content, cards, rows(o), now)
            assertEquals(LangMetrics(e["inputSeconds"]!!.jsonPrimitive.double, e["inputHours"]!!.jsonPrimitive.double, e["knownWords"]!!.jsonPrimitive.int), got, o["name"]!!.jsonPrimitive.content)
        }
    }
}
