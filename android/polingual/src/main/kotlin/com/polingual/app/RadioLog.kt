package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.engine.InputStage
import foundation.bucket.core.engine.ListenInput
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.ReviewLog
import foundation.bucket.core.engine.UploadGate
import foundation.bucket.core.data.StudySync
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonArray

class LogQueue(private val kv: KeyValue, private val key: String, private val cap: Int) {
    fun rows(): List<LogRow> = runCatching { Json.parseToJsonElement(kv.get(key) ?: "[]").jsonArray }.getOrNull()
        ?.mapNotNull { ReviewLog.parse(it)?.takeIf { r -> r !is LogRow.Review } }.orEmpty()

    fun append(add: List<LogRow>) {
        val have = rows()
        val ids = have.map { it.id }.toSet()
        val fresh = add.filter { it !is LogRow.Review && it.id !in ids }.distinctBy { it.id }
        if (fresh.isEmpty()) return
        write((have + fresh).takeLast(cap))
    }

    private fun write(rows: List<LogRow>) = kv.set(key, if (rows.isEmpty()) null else JsonArray(rows.mapNotNull(ReviewLog::encodeRow)).toString())

    fun gate(): UploadGate = runCatching { UploadGate.valueOf(kv.get(RadioLog.GATE_KEY) ?: "") }.getOrDefault(UploadGate.Unknown)

    suspend fun upload(post: suspend (JsonObject) -> String?): Int {
        var gate = gate()
        if (gate == UploadGate.Unknown) {
            gate = StudySync.gateAfter(post(JsonObject(mapOf("events" to JsonArray(emptyList())))), gate)
            kv.set(RadioLog.GATE_KEY, gate.name)
        }
        if (gate != UploadGate.Open) return 0
        val sent = ReviewLog.take(rows())
        val batch = StudySync.batch(sent, gate) ?: return 0
        val outcome = post(batch)
        kv.set(RadioLog.GATE_KEY, StudySync.gateAfter(outcome, gate).name)
        if (outcome != "recorded") return 0
        val ids = sent.map { it.id }.toSet()
        write(rows().filter { it.id !in ids })
        return sent.size
    }
}

class RadioLog(kv: KeyValue, cap: Int = MAX_ROWS) {
    private val queue = LogQueue(kv, KEY, cap)

    fun rows(): List<LogRow.Exposure> = queue.rows().filterIsInstance<LogRow.Exposure>()

    fun append(add: List<LogRow.Exposure>) = queue.append(add)

    fun gate(): UploadGate = queue.gate()

    suspend fun upload(post: suspend (JsonObject) -> String?): Int = queue.upload(post)

    fun log(h: Heard, systemId: String, device: String, tz: String, now: Long, ids: () -> String) {
        val rows = ListenInput.radioExposures(h.stationId, h.startedAt, h.ms.toDouble(), { 0.0 })
        append(rows.map { InputStage.logRow(it, h.lang, ids(), now, device, tz, systemId) })
    }

    companion object {
        const val KEY = "polingual.radioLog"
        const val MAX_ROWS = 2000
        const val GATE_KEY = "polingual.radioLog.gate"
        const val STUDY_KEY = "polingual.studyLog"
        const val STUDY_MAX_ROWS = 400
    }
}
