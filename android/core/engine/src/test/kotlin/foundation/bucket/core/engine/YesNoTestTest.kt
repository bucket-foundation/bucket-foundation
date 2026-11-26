package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
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

private fun JsonElement?.orNull(): JsonElement? = if (this == null || this is JsonNull) null else this

class YesNoTestTest {
    private val v = Json.parseToJsonElement(File(System.getProperty("yesNoVectors")).readText()).jsonObject
    private val words = v["words"]!!.jsonArray.map { it.jsonPrimitive.content }
    private val lex = YesNoTest.buildLexicon(words)
    private val candidates = v["candidates"]!!.jsonArray.map { YesNoTest.RankedWord(it.jsonObject["word"]!!.jsonPrimitive.content, it.jsonObject["rank"]!!.jsonPrimitive.int) }

    private fun items(e: JsonElement?): List<YesNoTest.TestItem>? = (e as? JsonArray)?.map {
        val o = it.jsonObject
        YesNoTest.TestItem(o["word"]!!.jsonPrimitive.content, o["real"]!!.jsonPrimitive.boolean, o["band"].orNull()?.jsonPrimitive?.int)
    }

    @Test
    fun goldenVectorsMatchTheWeb() {
        val r = YesNoTest.mulberry32(42)
        for (x in v["rand"]!!.jsonArray) assertEquals(x.jsonPrimitive.double, r(), 0.0)
        for (s in v["syllables"]!!.jsonArray) {
            val o = s.jsonObject
            val want = (o["syllables"] as? JsonArray)?.map { y -> y.jsonObject.let { YesNoTest.Syllable(it["o"]!!.jsonPrimitive.content, it["n"]!!.jsonPrimitive.content, it["c"]!!.jsonPrimitive.content) } }
            assertEquals(want, YesNoTest.syllabify(o["word"]!!.jsonPrimitive.content))
        }
        val pr = YesNoTest.mulberry32(7)
        for (p in v["pseudo"]!!.jsonArray) {
            val o = p.jsonObject
            assertEquals(o["out"].orNull()?.jsonPrimitive?.content, YesNoTest.pseudoword(o["word"]!!.jsonPrimitive.content, lex, pr))
        }
        val lexR = YesNoTest.buildLexicon(words, v["reject"]!!.jsonArray.map { it.jsonPrimitive.content })
        val pr2 = YesNoTest.mulberry32(7)
        for (p in v["pseudoReject"]!!.jsonArray) {
            val o = p.jsonObject
            assertEquals(o["out"].orNull()?.jsonPrimitive?.content, YesNoTest.pseudoword(o["word"]!!.jsonPrimitive.content, lexR, pr2))
        }
        val a = YesNoTest.assemble(candidates, emptySet(), 1001, lex)
        assertEquals(items(v["formA"]), a)
        assertEquals(items(v["formB"]), YesNoTest.assemble(candidates, emptySet(), 1002, lex, a!!.map { it.word }.toSet()))
        val score = YesNoTest.score(items(v["formA"])!!, v["yes"]!!.jsonArray.map { it.jsonPrimitive.content }.toSet())
        val ws = v["score"]!!.jsonObject
        assertEquals(ws["hits"]!!.jsonPrimitive.int, score.hits)
        assertEquals(ws["falseAlarms"]!!.jsonPrimitive.int, score.falseAlarms)
        assertEquals(ws["known"]!!.jsonPrimitive.double, score.known, 1e-9)
        for (k in v["known"]!!.jsonArray) {
            val a4 = k.jsonObject["args"]!!.jsonArray.map { it.jsonPrimitive.int }
            assertEquals(k.jsonObject["known"]!!.jsonPrimitive.double, YesNoTest.known(a4[0], a4[1], a4[2], a4[3]), 1e-9)
        }
        for (d in v["due"]!!.jsonArray) {
            val o = d.jsonObject
            val t = o["taken"]!!.jsonObject
            val at = o["enrolledAt"].orNull()?.jsonPrimitive?.long
            val want = o["due"].orNull()?.jsonPrimitive?.content
            assertEquals(want, YesNoTest.due(at, o["now"]!!.jsonPrimitive.long, YesNoTest.Taken(t["baseline"]!!.jsonPrimitive.boolean, t["day28"]!!.jsonPrimitive.boolean)))
        }
    }
}
