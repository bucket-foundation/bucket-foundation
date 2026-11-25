package foundation.bucket.core.data

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.UploadGate
import foundation.bucket.core.engine.StudyState
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class StudySyncTest {
    private val web = Json.parseToJsonElement(
        """{"cards":{"fr:chat":{"state":"review","stability":9.5,"difficulty":5.1,"due":5000,"lastReview":2000,"reps":3,"lapses":0},
        "es:gato":{"state":"review","stability":4.0,"due":9000,"lastReview":9000,"reps":2,"lapses":1}},
        "prof":{"fr":{"n":4}},"settings":{"newPerDay":10},
        "stats":{"xp":40,"streak":2,"lastStudyDay":"2026-11-20","history":{"2026-11-20":{"new":3,"reviews":5}}}}""",
    ).jsonObject

    @Test fun branchMatchesWebAndIos() {
        assertEquals("lang-sys-abc", StudySync.branch("abc"))
        assertEquals(64, StudySync.branch("x".repeat(80)).length)
    }

    @Test fun newerCardWinsPerIdAndWebFieldsSurvive() {
        val local = StudyState(
            cards = mapOf("fr:chat" to CardState(4, 0, 6.25, 99_000, 3000), "es:gato" to CardState(1, 0, 1.0, 100, 100), "de:hund" to CardState(1, 0, 1.0, 50, 40)),
            days = listOf("2026-11-21"),
        )
        val merged = StudySync.merge(web, local)
        val cards = merged["cards"]!!.jsonObject
        assertEquals("4", cards["fr:chat"]!!.jsonObject["reps"]!!.jsonPrimitive.content)
        assertEquals("5.1", cards["fr:chat"]!!.jsonObject["difficulty"]!!.jsonPrimitive.content)
        assertEquals("2", cards["es:gato"]!!.jsonObject["reps"]!!.jsonPrimitive.content)
        assertNotNull(cards["de:hund"])
        assertEquals(web["prof"], merged["prof"])
        assertEquals(web["settings"], merged["settings"])
        val stats = merged["stats"]!!.jsonObject
        assertEquals("40", stats["xp"]!!.jsonPrimitive.content)
        assertEquals("2026-11-21", stats["lastStudyDay"]!!.jsonPrimitive.content)
        assertEquals("5", stats["history"]!!.jsonObject["2026-11-20"]!!.jsonObject["reviews"]!!.jsonPrimitive.content)
        assertEquals("1", stats["history"]!!.jsonObject["2026-11-21"]!!.jsonObject["reviews"]!!.jsonPrimitive.content)
    }

    @Test fun mergingAgainTheSameStateChangesNothing() {
        val local = StudySync.state(web, StudyState())
        assertEquals(web["cards"], StudySync.merge(web, local)["cards"])
    }

    @Test fun pulledStateCarriesWebCardsAndDays() {
        val s = StudySync.state(web, StudyState(days = listOf("2026-11-22"), newDay = "2026-11-22", newToday = mapOf("fr" to 2)))
        assertEquals(CardState(3, 0, 9.5, 5000, 2000), s.cards["fr:chat"])
        assertEquals(listOf("2026-11-20", "2026-11-22"), s.days)
        assertEquals(mapOf("fr" to 2), s.newToday)
    }

    @Test fun emptyRemoteTakesAllLocalCards() {
        val merged = StudySync.merge(null, StudyState(cards = mapOf("fr:x" to CardState(1, 0, 1.0, 10, 5))))
        assertEquals(JsonPrimitive("review"), merged["cards"]!!.jsonObject["fr:x"]!!.jsonObject["state"])
        assertEquals(JsonObject(emptyMap()), merged["stats"]!!.jsonObject["history"])
    }

    @Test
    fun aStaleOfflineReviewNeverLowersWebReps() {
        val stale = StudyState(cards = mapOf("fr:chat" to CardState(reps = 2, intervalDays = 1.0, due = 1, last = 99_000)))
        val chat = StudySync.merge(web, stale)["cards"]!!.jsonObject["fr:chat"]!!.jsonObject
        assertEquals(3, chat["reps"]!!.jsonPrimitive.content.toInt())
        assertEquals(9.5, chat["stability"]!!.jsonPrimitive.content.toDouble())
        val ahead = StudyState(cards = mapOf("fr:chat" to CardState(reps = 4, intervalDays = 12.0, due = 1, last = 1_000)))
        assertEquals(4, StudySync.merge(web, ahead)["cards"]!!.jsonObject["fr:chat"]!!.jsonObject["reps"]!!.jsonPrimitive.content.toInt())
    }

    @Test
    fun aStalePushIsRejectedThenRemergedOnTheNewerVersion() = kotlinx.coroutines.test.runTest {
        val local = StudyState(cards = mapOf("de:hund" to CardState(reps = 1, intervalDays = 1.0, due = 1, last = 5_000)))
        val newer = JsonObject(web + mapOf("cards" to JsonObject(web["cards"]!!.jsonObject + ("it:cane" to JsonObject(mapOf("reps" to JsonPrimitive(1), "lastReview" to JsonPrimitive(6_000)))))))
        val versions = mutableListOf<String?>()
        var server: Pair<JsonObject, String> = web to "v1"
        var raced = false
        val out = StudySync.settle(local, { StudySync.Remote(server.first, server.second) }, { data, version ->
            versions += version
            if (!raced) { raced = true; server = newer to "v2"; StudySync.Outcome.Stale } else { server = data to "v3"; StudySync.Outcome.Saved }
        })
        assertEquals(listOf<String?>("v1", "v2"), versions)
        val cards = assertNotNull(out)["cards"]!!.jsonObject
        assertNotNull(cards["it:cane"])
        assertNotNull(cards["de:hund"])
    }

    @Test
    fun settleGivesUpAfterRepeatedStalePushes() = kotlinx.coroutines.test.runTest {
        val local = StudyState(cards = mapOf("de:hund" to CardState(reps = 1, intervalDays = 1.0, due = 1, last = 5_000)))
        var pushes = 0
        assertEquals(null, StudySync.settle(local, { StudySync.Remote(web, "v") }, { _, _ -> pushes++; StudySync.Outcome.Stale }))
        assertEquals(3, pushes)
    }

    @Test
    fun androidPicksTheSharedFixtureWinnerInEitherOrder() {
        val cases = Json.parseToJsonElement(java.io.File("../../../scripts/fixtures/card-merge-cases.json").readText()).jsonArray
        for (c in cases) {
            val o = c.jsonObject
            val winner = o["winner"]!!.jsonPrimitive.content
            for ((mine, theirs) in listOf("a" to "b", "b" to "a")) {
                val local = StudySync.card(o[mine]!!.jsonObject)
                assertEquals(winner == mine, StudySync.localWins(local, o[theirs]!!.jsonObject), "case $c local $mine")
            }
        }
    }

    @Test
    fun aSessionBatchCarriesExposuresAndTheMixAndNothingWhenGated() {
        val rows = listOf(
            LogRow.Review("r", 1, "d", "UTC", "s", "es:casa", 3),
            LogRow.Exposure("e", 2, "d", "UTC", "s", "es", "tatoeba:1", "set:es:1", listOf("casa"), listOf("casa"), 30, 0.95, true),
            LogRow.Session("x", 3, "d", "UTC", "s", "es", "s-1", 0, 600_000, 0.7, 0.66, "share70", 1, 2),
        )
        val batch = assertNotNull(StudySync.batch(rows, UploadGate.Unknown))
        assertEquals(listOf("exposure", "session_mix"), batch["events"]!!.jsonArray.map { it.jsonObject["name"]!!.jsonPrimitive.content })
        assertEquals(null, StudySync.batch(rows, UploadGate.Closed))
        assertEquals(UploadGate.Closed, StudySync.gateAfter("under_age", UploadGate.Unknown))
        assertEquals(UploadGate.Closed, StudySync.gateAfter("no_consent", UploadGate.Open))
        assertEquals(UploadGate.Open, StudySync.gateAfter("recorded", UploadGate.Unknown))
        assertEquals(UploadGate.Unknown, StudySync.gateAfter(null, UploadGate.Unknown))
    }
}
