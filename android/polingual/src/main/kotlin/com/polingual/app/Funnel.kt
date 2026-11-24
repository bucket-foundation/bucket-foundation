package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class Funnel(private val kv: KeyValue, private val makeId: () -> String, private val post: suspend (String) -> Unit) {
    val visitor: String get() = kv.get(VISITOR_KEY) ?: makeId().also { kv.set(VISITOR_KEY, it) }

    fun body(name: String, detail: String? = null): String? {
        if (name !in NAMES) return null
        if (name in ONCE) {
            val key = "$ONCE_PREFIX$name"
            if (kv.get(key) != null) return null
            kv.set(key, "1")
        }
        val event = buildMap<String, JsonPrimitive> {
            put("name", JsonPrimitive(name))
            put("path", JsonPrimitive("/android"))
            if (detail != null) put("detail", JsonPrimitive(detail))
        }
        return JsonObject(mapOf("visitor" to JsonPrimitive(visitor), "events" to JsonArray(listOf(JsonObject(event))))).toString()
    }

    suspend fun send(name: String, detail: String? = null) {
        val b = body(name, detail) ?: return
        runCatching { post(b) }
    }

    companion object {
        const val VISITOR_KEY = "polingual.funnel.visitor"
        const val ONCE_PREFIX = "polingual.funnel.once."
        const val EVENTS_URL = "https://www.polingual.com/api/events"
        const val CLIENT = "android"
        val NAMES = setOf("signup", "first_lesson", "paywall_view", "trial_start", "paid", "onboarding_view", "heard_about", "trial_cancel_d0")
        val ONCE = setOf("signup", "first_lesson", "trial_start", "paid", "heard_about", "trial_cancel_d0")
        val SCREENS = listOf("welcome", "heard_about", "languages")
        val HEARD = listOf(
            "tiktok" to "TikTok", "instagram" to "Instagram", "youtube" to "YouTube", "google_play" to "Google Play",
            "search" to "Google or another search", "friend" to "A friend or family", "school" to "School or a teacher",
            "reddit" to "Reddit", "other" to "Somewhere else",
        )

        fun dayZeroCancel(record: PurchaseRecord?, trialStartMs: Long?, nowMs: Long): Boolean =
            record != null && trialStartMs != null && record.purchasedMs == trialStartMs && !record.autoRenewing && nowMs - trialStartMs < TrialReminder.DAY_MS
    }
}
