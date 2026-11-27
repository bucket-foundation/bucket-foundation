package foundation.bucket.core.data

import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.UploadGate
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlin.test.Test
import kotlin.test.assertEquals

class VocabBatchTest {
    @Test fun vocabTestBatchesLikeWeb() {
        val r = LogRow.VocabTest("v1", 1_000L, "d-1", "UTC", "sys", "es", "day28", "B", "s50", 40, 50, 2, 20, 5123.4, 29, 180)
        val batch = StudySync.batch(listOf(r), UploadGate.Open)!!
        val expected = Json.parseToJsonElement("""{"id":"v1","name":"vocab_test","props":{"phase":"day28","form":"B","arm":"s50","hits":40,"words":50,"false_alarms":2,"pseudowords":20,"known":5123.4,"day":29,"seconds":180}}""")
        assertEquals(listOf(expected), batch["events"]!!.jsonArray.toList())
    }
}
