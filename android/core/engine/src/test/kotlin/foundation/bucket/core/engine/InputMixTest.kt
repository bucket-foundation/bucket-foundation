package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class InputMixTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("inputMixVectors")).readText()).jsonObject
    private fun close(a: Double, b: Double, m: String) = assertTrue(abs(a - b) < 1e-8, "$m: $a vs $b")

    @Test
    fun goldenTargetsSharesAndPlans() {
        for (t in v["target"]!!.jsonArray) close(SessionMix.inputTarget(t.jsonObject["tier"]!!.jsonPrimitive.int), t.jsonObject["expect"]!!.jsonPrimitive.double, "target")
        for (s in v["share"]!!.jsonArray) {
            val o = s.jsonObject
            close(SessionMix.inputShare(o["tier"]!!.jsonPrimitive.int, o["eligible"]!!.jsonPrimitive.double, o["session"]!!.jsonPrimitive.double), o["expect"]!!.jsonPrimitive.double, "share")
        }
        for (p in v["plan"]!!.jsonArray) {
            val o = p.jsonObject
            val m = SessionMix.planInputMix(o["tier"]!!.jsonPrimitive.int, o["cards"]!!.jsonPrimitive.int, o["units"]!!.jsonArray.map { it.jsonPrimitive.double })
            val e = o["expect"]!!.jsonObject
            close(m.target, e["target"]!!.jsonPrimitive.double, "plan target")
            close(m.share, e["share"]!!.jsonPrimitive.double, "plan share")
            close(m.plannedShare, e["plannedShare"]!!.jsonPrimitive.double, "plan planned")
            assertEquals(e["units"]!!.jsonPrimitive.int, m.units)
            assertEquals(e["positions"]!!.jsonArray.map { it.jsonPrimitive.int }, m.positions)
        }
        for (r in v["rounded"]!!.jsonArray) {
            val o = r.jsonObject
            assertEquals(o["expect"]!!.jsonPrimitive.int, SessionMix.roundedItems(o["targetPermille"]!!.jsonPrimitive.int, o["items"]!!.jsonPrimitive.int))
        }
    }

    @Test
    fun goldenActivityCounter() {
        for (a in v["activity"]!!.jsonArray) {
            val o = a.jsonObject
            val marks = o["marks"]!!.jsonArray.map {
                val m = it.jsonObject
                fun b(k: String) = (m[k])?.jsonPrimitive?.booleanOrNull
                SessionMix.ActivityMark(m["at"]!!.jsonPrimitive.long, b("visible"), b("focused"), b("playing"))
            }
            assertEquals(o["expect"]!!.jsonPrimitive.long, SessionMix.activeMs(marks, o["end"]!!.jsonPrimitive.long, o["needsPlayer"]!!.jsonPrimitive.booleanOrNull!!), o["name"]!!.jsonPrimitive.content)
        }
    }
}
