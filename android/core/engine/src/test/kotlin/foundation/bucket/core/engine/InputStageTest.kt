package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class InputStageTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("inputStageVectors")).readText()).jsonObject
    private val fixture = File(System.getProperty("inputFixture")).readText()

    @Test
    fun goldenViewingAndRowsMatchTheWeb() {
        val items = v["items"]!!.jsonArray.map { it.jsonObject }.map { o ->
            InputItem(o["id"]!!.jsonPrimitive.content, "sentence", o["tokens"]!!.jsonArray.map { t -> InputToken(t.jsonObject["surface"]!!.jsonPrimitive.content, t.jsonObject["lemma"]!!.jsonPrimitive.content) }, "", null, null, null)
        }
        val unitId = v["unit"]!!.jsonPrimitive.content
        for (c in v["cases"]!!.jsonArray) {
            val o = c.jsonObject
            val plan = InputPlan(unitId, 41, false, o["coverage"]!!.jsonPrimitive.double, emptyList(), emptyList(), true, 0.0)
            val choice = StageChoice(InputUnit(unitId, "sentence_set", items.map { it.id }, emptyList()), items, plan, false)
            var view = Viewing()
            for (op in o["ops"]!!.jsonArray) {
                val x = op.jsonObject
                when (x["op"]!!.jsonPrimitive.content) {
                    "tap" -> { val it = items[x["item"]!!.jsonPrimitive.int]; view = InputStage.toggleTap(view, it.id, it.tokens[x["token"]!!.jsonPrimitive.int].lemma) }
                    "seen" -> view = InputStage.addSeen(view, x["items"]!!.jsonArray.map { items[it.jsonPrimitive.int].id }, x["ms"]!!.jsonPrimitive.double)
                    "reveal" -> view = InputStage.reveal(view, items[x["item"]!!.jsonPrimitive.int].id)
                }
            }
            val rows = InputStage.exposureRows(choice, view, o["completed"]!!.jsonPrimitive.booleanOrNull!!)
            val want = o["expect"]!!.jsonArray.map { it.jsonObject }
            val name = o["name"]!!.jsonPrimitive.content
            assertEquals(want.size, rows.size, name)
            rows.zip(want).forEach { (r, w) ->
                assertEquals(w["item"]!!.jsonPrimitive.content, r.item, name)
                assertEquals(w["lemmas_seen"]!!.jsonArray.map { it.jsonPrimitive.content }, r.lemmasSeen, name)
                assertEquals(w["taps"]!!.jsonArray.map { it.jsonPrimitive.content }, r.taps, name)
                assertEquals(w["seconds"]!!.jsonPrimitive.int, r.seconds, name)
                assertEquals(w["coverage_pred"]!!.jsonPrimitive.double, r.coveragePred, name)
                assertEquals(w["completed"]!!.jsonPrimitive.booleanOrNull, r.completed, name)
                assertEquals(w["revealed"]!!.jsonPrimitive.booleanOrNull, r.revealed, name)
            }
        }
    }

    @Test
    fun theFixtureBundleParsesAndABeginnerGetsNoEligibleUnit() {
        val b = assertNotNull(InputStage.parseBundle(fixture))
        assertEquals("es", b.lang)
        val nothing = InputStage.learner(StudyState(), "es", { _, _ -> null }, 0, emptyMap(), null)
        assertEquals(emptyList(), InputStage.eligibleUnitSeconds(b, nothing))
        assertNull(InputStage.choose(b, nothing, allowFallback = false))
        assertNotNull(InputStage.choose(b, nothing, allowFallback = true))
        assertNull(InputStage.parseBundle("{\"format\":\"other\"}"))
    }
}
