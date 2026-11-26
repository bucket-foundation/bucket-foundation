package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LearnerModelTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("learnerModelVectors")).readText()).jsonObject
    private val now = v["now"]!!.jsonPrimitive.double

    private fun close(a: Double, b: Double, m: String) = assertTrue(abs(a - b) < 1e-8, "$m: $a vs $b")

    private fun evidence(o: JsonObject): LemmaEvidence {
        fun d(k: String) = (o[k] as? JsonPrimitive)?.doubleOrNull
        val f = o["freq"] as? JsonObject
        return LemmaEvidence(d("stability"), d("lastReview"), d("lastTap"), d("exposures")?.toInt() ?: 0,
            f?.let { FreqPrior(it["rank"]!!.jsonPrimitive.double, it["derived"]!!.jsonPrimitive.booleanOrNull!!) })
    }

    @Test
    fun goldenKnown() {
        for (c in v["known"]!!.jsonArray) {
            val o = c.jsonObject
            val name = o["name"]!!.jsonPrimitive.content
            val k = LearnerModel.known(evidence(o["evidence"]!!.jsonObject), now, o["tier"]!!.jsonPrimitive.int, o["lambda"]!!.jsonPrimitive.double)
            val e = o["expect"]!!.jsonObject
            close(k.p, e["p"]!!.jsonPrimitive.double, name)
            assertEquals(e["known"]!!.jsonPrimitive.booleanOrNull, k.known, name)
            assertEquals(e["source"]!!.jsonPrimitive.content, k.source, name)
        }
    }

    @Test
    fun goldenKnownCountRowsAndPriors() {
        for (c in v["knownCount"]!!.jsonArray) {
            val o = c.jsonObject
            val lemmas = o["lemmas"]!!.jsonObject.mapValues { evidence(it.value.jsonObject) }
            close(LearnerModel.knownCount(lemmas, now, o["tier"]!!.jsonPrimitive.int, o["lambda"]!!.jsonPrimitive.double), o["expect"]!!.jsonPrimitive.double, o["name"]!!.jsonPrimitive.content)
        }
        for (r in v["freqRows"]!!.jsonArray) {
            val o = r.jsonObject
            val row = o["row"]!!.jsonArray.map { e -> if (e is JsonNull) null else e.jsonPrimitive.let { p -> if (p.isString) p.content else p.doubleOrNull } }
            val want = (o["expect"] as? JsonObject)?.let { FreqPrior(it["rank"]!!.jsonPrimitive.double, it["derived"]!!.jsonPrimitive.booleanOrNull!!) }
            assertEquals(want, LearnerModel.freqFromRow(row))
        }
        for (p in v["prior"]!!.jsonArray) {
            val o = p.jsonObject
            close(LearnerModel.frequencyPrior(FreqPrior(o["rank"]!!.jsonPrimitive.double, false), o["tier"]!!.jsonPrimitive.int), o["expect"]!!.jsonPrimitive.double, "prior")
        }
    }

    @Test
    fun priorsMatchTheWebAndStayBelowTheBar() {
        val p = v["priors"]!!.jsonObject
        assertEquals(FrequencyPriors(p["halfRank"]!!.jsonPrimitive.double, p["slope"]!!.jsonPrimitive.double, p["derivedRankFactor"]!!.jsonPrimitive.double, p["cap"]!!.jsonPrimitive.double), FrequencyPriors.DEFAULT)
        for (rank in listOf(1.0, 10.0, 100.0)) for (tier in listOf(0, 50)) assertTrue(!LearnerModel.known(LemmaEvidence(freq = FreqPrior(rank, false)), now, tier).known)
        assertTrue(FrequencyPriors(cap = 0.99).bounded().cap < LearnerModel.KNOWN_R)
        assertEquals(FrequencyPriors.SLOPE.endInclusive, FrequencyPriors(slope = 99.0).bounded().slope)
    }
}
