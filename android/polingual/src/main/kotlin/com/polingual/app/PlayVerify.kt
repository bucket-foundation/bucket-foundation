package com.polingual.app

object PlayVerify {
    const val SERVER_WINDOW_MS = 2L * 24 * 3600 * 1000

    fun clientAck(pending: Boolean, acknowledged: Boolean, verified: Boolean, signedIn: Boolean, purchasedMs: Long, nowMs: Long): Boolean {
        if (pending || acknowledged || verified) return false
        return !signedIn || nowMs - purchasedMs >= SERVER_WINDOW_MS
    }
}
