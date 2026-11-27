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

class RadioLog(private val kv: KeyValue, private val cap: Int = MAX_ROWS) {
    fun rows(): List<LogRow.Exposure> = runCatching { Json.parseToJsonElement(kv.get(KEY) ?: "[]").jsonArray }.getOrNull()
        ?.mapNotNull { ReviewLog.parse(it) as? LogRow.Exposure }.orEmpty()

    fun append(add: List<LogRow.Exposure>) {
        if (add.isEmpty()) return
        val all = (rows() + add).takeLast(cap)
        kv.set(KEY, JsonArray(all.map(ReviewLog::encode)).toString())
    }

    fun gate(): UploadGate = runCatching { UploadGate.valueOf(kv.get(GATE_KEY) ?: "") }.getOrDefault(UploadGate.Unknown)

    suspend fun upload(post: suspend (JsonObject) -> String?): Int {
        var gate = gate()
        if (gate == UploadGate.Unknown) {
            gate = StudySync.gateAfter(post(JsonObject(mapOf("events" to JsonArray(emptyList())))), gate)
            kv.set(GATE_KEY, gate.name)
        }
        if (gate == UploadGate.Closed) {
            kv.set(KEY, null)
            return 0
        }
        if (gate != UploadGate.Open) return 0
        val rows = rows()
        val sent = ReviewLog.take(rows).filterIsInstance<LogRow.Exposure>()
        val batch = StudySync.batch(sent, gate) ?: return 0
        val outcome = post(batch)
        val next = StudySync.gateAfter(outcome, gate)
        kv.set(GATE_KEY, next.name)
        if (next == UploadGate.Closed) {
            kv.set(KEY, null)
            return 0
        }
        if (outcome != "recorded") return 0
        val ids = sent.map { it.id }.toSet()
        val left = rows().filter { it.id !in ids }
        kv.set(KEY, if (left.isEmpty()) null else JsonArray(left.map(ReviewLog::encode)).toString())
        return sent.size
    }

    fun log(h: Heard, systemId: String, device: String, tz: String, now: Long, ids: () -> String) {
        val rows = ListenInput.radioExposures(h.stationId, h.startedAt, h.ms.toDouble(), { 0.0 })
        append(rows.map { InputStage.logRow(it, h.lang, ids(), now, device, tz, systemId) })
    }

    companion object {
        const val KEY = "polingual.radioLog"
        const val MAX_ROWS = 2000
        const val GATE_KEY = "polingual.radioLog.gate"
    }
}
