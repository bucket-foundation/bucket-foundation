package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class InputExperimentTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("inputExperimentVectors")).readText()).jsonObject

    private fun str(e: kotlinx.serialization.json.JsonElement?): String? = if (e == null || e is JsonNull) null else e.jsonPrimitive.content

    @Test
    fun theFlagIsOffUnlessSetToOne() {
        assertFalse(InputExperiment.on(null))
        assertFalse(InputExperiment.on("true"))
        assertTrue(InputExperiment.on("1"))
    }

    @Test
    fun goldenVectorsMatchTheWeb() {
        for (h in v["hashes"]!!.jsonArray) assertEquals(h.jsonObject["hash"]!!.jsonPrimitive.long, InputExperiment.fnv1a32(h.jsonObject["key"]!!.jsonPrimitive.content))
        for (a in v["assign"]!!.jsonArray) {
            val o = a.jsonObject
            assertEquals(o["arm"]!!.jsonPrimitive.content, InputExperiment.assignArm(o["key"]!!.jsonPrimitive.content, o["tier"]!!.jsonPrimitive.int))
        }
        for (f in v["fill"]!!.jsonArray) {
            val o = f.jsonObject
            assertEquals(o["fill"]!!.jsonPrimitive.boolean, InputExperiment.canFill(o["cards"]!!.jsonPrimitive.int, o["seconds"]!!.jsonArray.map { it.jsonPrimitive.double }))
        }
        for (m in v["mixes"]!!.jsonArray) {
            val o = m.jsonObject
            val got = InputExperiment.mix(o["on"]!!.jsonPrimitive.boolean, str(o["key"]), o["tier"]!!.jsonPrimitive.int, o["cards"]!!.jsonPrimitive.int, o["seconds"]!!.jsonArray.map { it.jsonPrimitive.double })
            assertEquals(str(o["arm"]), got.arm)
            assertEquals(o["target"]!!.jsonPrimitive.double, got.mix.target, 1e-12)
            assertEquals(o["share"]!!.jsonPrimitive.double, got.mix.share, 1e-9)
            assertEquals(o["units"]!!.jsonPrimitive.int, got.mix.units)
            assertEquals(o["positions"]!!.jsonArray.map { it.jsonPrimitive.int }, got.mix.positions)
        }
    }
}
