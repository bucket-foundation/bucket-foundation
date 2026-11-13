package foundation.bucket.core.data

import foundation.bucket.core.model.LangSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SystemsSyncTest {
    private val remote = Json.parseToJsonElement("""
        {"systems":[
          {"id":"a","name":"Romance from English","root":"en","targets":["fr","es"],"createdAt":1,"updatedAt":5,"placement":{"fr":2},"placedAt":{"fr":4},"levels":{"fr":"A1"}},
          {"id":"b","name":"Germanic","root":"en","targets":["de"],"createdAt":2}
        ],"removed":{"z":9}}
    """)

    @Test
    fun keepsIosFieldsWhenLocalIsOlder() {
        val local = listOf(LangSystem("a", "Old", "en", listOf("fr"), 1.0, 3.0))
        val merged = SystemsSync.merge(remote, local, emptyMap())
        val a = merged["systems"]!!.jsonArray.first().jsonObject
        assertEquals("Romance from English", a["name"]!!.jsonPrimitive.content)
        assertTrue("placedAt" in a && "levels" in a)
    }

    @Test
    fun newerLocalOverwritesItsFieldsAndKeepsUnknownOnes() {
        val local = listOf(LangSystem("a", "Mine", "en", listOf("fr", "es", "it"), 1.0, 9.0))
        val a = SystemsSync.merge(remote, local, emptyMap())["systems"]!!.jsonArray.first().jsonObject
        assertEquals("Mine", a["name"]!!.jsonPrimitive.content)
        assertEquals(3, a["targets"]!!.jsonArray.size)
        assertTrue("levels" in a)
    }

    @Test
    fun tieKeepsTheServerCopy() {
        val local = listOf(LangSystem("a", "Tie", "en", listOf("fr"), 1.0, 5.0))
        val a = SystemsSync.merge(remote, local, emptyMap())["systems"]!!.jsonArray.first().jsonObject
        assertEquals("Romance from English", a["name"]!!.jsonPrimitive.content)
    }

    @Test
    fun tombstonesDropOlderSystemsAndMergeByMax() {
        val merged = SystemsSync.merge(remote, emptyList(), mapOf("b" to 10.0, "z" to 3.0))
        assertEquals(listOf("a"), SystemsSync.systems(merged).map { it.id })
        val removed = merged["removed"] as JsonObject
        assertEquals("9.0", removed["z"]!!.jsonPrimitive.content)
        assertEquals("10.0", removed["b"]!!.jsonPrimitive.content)
    }

    @Test
    fun recreatedAfterTombstoneSurvives() {
        val local = listOf(LangSystem("b", "Germanic", "en", listOf("de"), 2.0, 20.0))
        val merged = SystemsSync.merge(remote, local, mapOf("b" to 10.0))
        assertTrue(SystemsSync.systems(merged).any { it.id == "b" })
    }

    @Test
    fun addsLocalOnlySystemsAndHandlesEmptyRemote() {
        val local = listOf(LangSystem("c", "Iberian", "en", listOf("es", "pt"), 3.0, 3.0))
        assertEquals(listOf("a", "b", "c"), SystemsSync.systems(SystemsSync.merge(remote, local, emptyMap())).map { it.id })
        assertEquals(listOf("c"), SystemsSync.systems(SystemsSync.merge(null, local, emptyMap())).map { it.id })
    }
}
