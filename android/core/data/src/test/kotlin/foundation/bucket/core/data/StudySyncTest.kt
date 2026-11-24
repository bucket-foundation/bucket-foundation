package foundation.bucket.core.data

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.StudyState
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
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
}
