package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
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
import kotlin.test.assertNull
import kotlin.test.assertTrue

class InputExperimentTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("inputExperimentVectors")).readText()).jsonObject

    private fun JsonElement?.orNull(): JsonElement? = if (this == null || this is JsonNull) null else this

    private fun enrolment(e: JsonElement?): InputExperiment.Enrolment? = e.orNull()?.jsonObject?.let {
        InputExperiment.Enrolment(it["experiment"]!!.jsonPrimitive.content, it["key"]!!.jsonPrimitive.content, it["arm"]!!.jsonPrimitive.content, it["stratum"]!!.jsonPrimitive.content, it["at"]!!.jsonPrimitive.long)
    }

    @Test
    fun theFlagIsOffUnlessSetToOne() {
        assertFalse(InputExperiment.on(null))
        assertFalse(InputExperiment.on("true"))
        assertTrue(InputExperiment.on("1"))
    }

    @Test
    fun goldenVectorsMatchTheWeb() {
        for (h in v["hashes"]!!.jsonArray) assertEquals(h.jsonObject["hash"]!!.jsonPrimitive.long, InputExperiment.fnv1a32(h.jsonObject["key"]!!.jsonPrimitive.content))
        for (k in v["keysFor"]!!.jsonArray) {
            val o = k.jsonObject
            assertEquals(o["key"]!!.jsonPrimitive.content, InputExperiment.enrolmentKey(o["account"].orNull()?.jsonPrimitive?.content, o["device"]!!.jsonPrimitive.content))
        }
        for (a in v["assign"]!!.jsonArray) {
            val o = a.jsonObject
            assertEquals(o["arm"]!!.jsonPrimitive.content, InputExperiment.assignArm(o["key"]!!.jsonPrimitive.content))
        }
        for (f in v["fill"]!!.jsonArray) {
            val o = f.jsonObject
            assertEquals(o["fill"]!!.jsonPrimitive.boolean, InputExperiment.canFill(o["cards"]!!.jsonPrimitive.int, o["seconds"]!!.jsonArray.map { it.jsonPrimitive.double }))
        }
        for (m in v["mixes"]!!.jsonArray) {
            val o = m.jsonObject
            val c = o["consent"]!!.jsonObject
            val consent = InputExperiment.Consent(c["flag"]!!.jsonPrimitive.boolean, c["uploadOpen"]!!.jsonPrimitive.boolean, c["disclosed"]!!.jsonPrimitive.boolean, c["optedOut"]!!.jsonPrimitive.boolean)
            val got = InputExperiment.mix(consent, enrolment(o["enrolment"]), o["key"].orNull()?.jsonPrimitive?.content, o["tier"]!!.jsonPrimitive.int, o["cards"]!!.jsonPrimitive.int, o["seconds"]!!.jsonArray.map { it.jsonPrimitive.double }, o["now"]!!.jsonPrimitive.long)
            assertEquals(o["arm"].orNull()?.jsonPrimitive?.content, got.arm)
            assertEquals(enrolment(o["enrolment_out"]), got.enrolment)
            assertEquals(o["target"]!!.jsonPrimitive.double, got.mix.target, 1e-12)
            assertEquals(o["share"]!!.jsonPrimitive.double, got.mix.share, 1e-9)
            assertEquals(o["units"]!!.jsonPrimitive.int, got.mix.units)
            assertEquals(o["positions"]!!.jsonArray.map { it.jsonPrimitive.int }, got.mix.positions)
        }
    }

    @Test
    fun anEnrolmentRoundTripsAndRejectsUnknownArms() {
        val e = InputExperiment.Enrolment(InputExperiment.EXPERIMENT_ID, "acct:u", "s70", "past-a2", 9)
        assertEquals(e, InputExperiment.parseEnrolment(InputExperiment.encode(e)))
        assertNull(InputExperiment.parseEnrolment(InputExperiment.encode(e.copy(arm = "s60"))))
        assertNull(InputExperiment.parseEnrolment(InputExperiment.encode(e.copy(experiment = "old"))))
        assertNull(InputExperiment.parseEnrolment("{broken"))
    }
}
