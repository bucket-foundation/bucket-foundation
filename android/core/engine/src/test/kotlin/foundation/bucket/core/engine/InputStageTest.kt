package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
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
        val nothing = InputStage.learner(StudyState(), "es", { _, _ -> null }, 0, 0, emptySet(), emptyMap(), null)
        assertEquals(emptyList(), InputStage.eligibleUnitSeconds(b, nothing))
        assertNull(InputStage.choose(b, nothing, allowFallback = false))
        assertNotNull(InputStage.choose(b, nothing, allowFallback = true))
        assertNull(InputStage.parseBundle("{\"format\":\"other\"}"))
    }

    @Test
    fun aVideoThatNeverPlaysLogsZeroSecondsWithTheReason() {
        val media = InputMedia("vid", 0.0, 3.0)
        val items = listOf(InputItem("video:vid:es:0", "video_segment", listOf(InputToken("Hola", "hola")), "Hola", null, null, media), InputItem("video:vid:es:1", "video_segment", listOf(InputToken("dos", "dos")), "dos", null, null, media))
        val plan = InputPlan("episode:vid:0", 40, true, 0.93, emptyList(), emptyList(), true, 0.0)
        val choice = StageChoice(InputUnit("episode:vid:0", "episode", items.map { it.id }, emptyList()), items, plan, false)
        val shown = InputStage.present(Viewing(), listOf(items[0].id))
        assertEquals(emptyList(), InputStage.exposureRows(choice, shown, completed = true))
        val rows = InputStage.exposureRows(choice, shown, completed = true, playerUnavailable = true)
        assertEquals(1, rows.size)
        assertEquals(0, rows[0].seconds)
        assertEquals("unavailable", rows[0].playback)
        val row = InputStage.logRow(rows[0], "es", "r", 1, "d", "UTC", "s")
        assertEquals("unavailable", (ReviewLog.parse(kotlinx.serialization.json.Json.parseToJsonElement(
            "{\"review_id\":\"r\",\"reviewed_at\":1,\"device_id\":\"d\",\"tz\":\"UTC\",\"system_id\":\"s\",\"kind\":\"exposure\",\"lang\":\"es\",\"item\":\"${row.item}\",\"unit\":\"u\",\"lemmas_seen\":[],\"taps\":[],\"seconds\":0,\"coverage_pred\":0.9,\"completed\":true,\"playback\":\"unavailable\"}",
        )) as LogRow.Exposure).playback)
    }

    @Test
    fun learnerAndDueLemmasMatchTheWebThroughTheResolver() {
        val lv = Json.parseToJsonElement(File(System.getProperty("learnerInputVectors")).readText()).jsonObject
        val now = lv["now"]!!.jsonPrimitive.double.toLong()
        val cards = lv["cards"]!!.jsonObject.mapValues { (_, c) ->
            val o = c.jsonObject
            CardState(reps = 1, intervalDays = o["stability"]!!.jsonPrimitive.double, due = o["due"]!!.jsonPrimitive.double.toLong(), last = o["lastReview"]!!.jsonPrimitive.double.toLong())
        }
        val state = StudyState(cards = cards)
        val resolve = { _: String, lemma: String -> "es:$lemma" }
        val b = assertNotNull(InputStage.parseBundle(fixture))
        assertEquals(lv["due"]!!.jsonArray.map { it.jsonPrimitive.content }.toSet(), InputStage.dueLemmas(b, state, "es", resolve, now))
        val freq = InputStage.freqIndex(lv["freq"]!!.jsonArray.map { e -> e.jsonArray.let { Triple(it[0].jsonPrimitive.content, it[1].jsonPrimitive.double, it[2].jsonPrimitive.boolean) } })
        for (c in lv["cases"]!!.jsonArray) {
            val o = c.jsonObject
            val l = InputStage.learner(state, "es", resolve, now, o["tier"]!!.jsonPrimitive.int, emptySet(), emptyMap(), null, freq)
            for ((lemma, r) in lv["rank"]!!.jsonObject) assertEquals(r.jsonPrimitive.doubleOrNull, l.rank(lemma), lemma)
            for ((lemma, p) in o["p"]!!.jsonObject) assertEquals(p.jsonPrimitive.double, l.p(lemma), 1e-8, lemma)
        }
    }

    @Test
    fun aFrequencyPriorAloneNeverMarksAnUnseenWordKnown() {
        val freq = InputStage.freqIndex(listOf(Triple("uno", 1.0, false)))
        for (tier in listOf(0, 4, 20)) {
            val l = InputStage.learner(StudyState(), "es", { _, lemma -> "es:$lemma" }, 0, tier, emptySet(), emptyMap(), null, freq)
            kotlin.test.assertTrue(l.p("uno") < LearnerModel.KNOWN_R, "$tier")
        }
        kotlin.test.assertTrue(FrequencyPriors.UNSTUDIED.cap < LearnerModel.KNOWN_R)
    }
}
