package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.engine.InputStage
import foundation.bucket.core.engine.ListenInput
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.ReviewLog
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

    fun log(h: Heard, systemId: String, device: String, tz: String, now: Long, ids: () -> String) {
        val rows = ListenInput.radioExposures(h.stationId, h.startedAt, h.ms.toDouble(), { 0.0 })
        append(rows.map { InputStage.logRow(it, h.lang, ids(), now, device, tz, systemId) })
    }

    companion object {
        const val KEY = "polingual.radioLog"
        const val MAX_ROWS = 2000
    }
}
