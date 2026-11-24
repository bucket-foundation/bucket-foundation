package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PlayVerifyTest {
    private val now = 10L * PlayVerify.SERVER_WINDOW_MS

    @Test
    fun serverVerifiedPurchaseNeedsNoClientAck() {
        assertFalse(PlayVerify.clientAck(pending = false, acknowledged = false, verified = true, signedIn = true, purchasedMs = now, nowMs = now))
    }

    @Test
    fun pendingOrAcknowledgedNeverAcks() {
        assertFalse(PlayVerify.clientAck(pending = true, acknowledged = false, verified = false, signedIn = false, purchasedMs = 0, nowMs = now))
        assertFalse(PlayVerify.clientAck(pending = false, acknowledged = true, verified = false, signedIn = false, purchasedMs = 0, nowMs = now))
    }

    @Test
    fun signedInFreshPurchaseWaitsForServer() {
        assertFalse(PlayVerify.clientAck(pending = false, acknowledged = false, verified = false, signedIn = true, purchasedMs = now - 1000, nowMs = now))
    }

    @Test
    fun clientAcksBeforeGoogleRefundWindowOrWhenSignedOut() {
        assertTrue(PlayVerify.clientAck(pending = false, acknowledged = false, verified = false, signedIn = true, purchasedMs = now - PlayVerify.SERVER_WINDOW_MS, nowMs = now))
        assertTrue(PlayVerify.clientAck(pending = false, acknowledged = false, verified = false, signedIn = false, purchasedMs = now, nowMs = now))
    }

    @Test
    fun purchaseNeedsAccountForObfuscatedId() {
        assertFalse(PlayVerify.canBuy(null))
        assertFalse(PlayVerify.canBuy(" "))
        assertTrue(PlayVerify.canBuy("u1"))
    }
}
