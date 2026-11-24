package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FunnelTest {
    private class Mem : KeyValue {
        val m = mutableMapOf<String, String>()
        override fun get(key: String) = m[key]
        override fun set(key: String, value: String?) { if (value == null) m.remove(key) else m[key] = value }
    }

    private val vid = "0b6f1d2e-8a4c-4f3e-9d2a-1c5b7e9f0a12"

    @Test
    fun onboardingScreensCarryTheirNameAndKeepOneVisitor() {
        val f = Funnel(Mem(), { vid }) {}
        for (screen in Funnel.SCREENS) {
            val e = Json.parseToJsonElement(f.body("onboarding_view", screen)!!).jsonObject
            assertEquals(vid, e["visitor"]!!.jsonPrimitive.content)
            assertEquals(screen, e["events"]!!.jsonArray[0].jsonObject["detail"]!!.jsonPrimitive.content)
        }
    }

    @Test
    fun onceEventsSendOnceAndUnknownNamesNever() {
        val f = Funnel(Mem(), { vid }) {}
        assertTrue(f.body("heard_about", "tiktok") != null)
        assertNull(f.body("heard_about", "reddit"))
        assertTrue(f.body("paywall_view") != null)
        assertTrue(f.body("paywall_view") != null)
        assertNull(f.body("drop_table"))
    }

    @Test
    fun sendPostsTheBody() = runBlocking {
        val sent = mutableListOf<String>()
        Funnel(Mem(), { vid }) { sent += it }.send("trial_start")
        assertEquals(1, sent.size)
    }

    @Test
    fun dayZeroCancelIsATurnedOffRenewalInTheFirstDay() {
        val start = 1_800_000_000_000L
        val off = PurchaseRecord(Plan.YEARLY, start, true, false, false)
        assertTrue(Funnel.dayZeroCancel(off, start, start + 3_600_000))
        assertFalse(Funnel.dayZeroCancel(off, start, start + TrialReminder.DAY_MS + 1))
        assertFalse(Funnel.dayZeroCancel(off.copy(autoRenewing = true), start, start + 1))
        assertFalse(Funnel.dayZeroCancel(null, start, start + 1))
    }
}
