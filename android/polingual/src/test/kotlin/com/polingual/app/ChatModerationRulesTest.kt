package com.polingual.app

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.LobbyMessage
import kotlin.test.assertEquals
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ChatModerationRulesTest {
    private fun msg(from: String) = LobbyMessage(1, from, from, "hola", "")

    @Test
    fun botsAndSelfHaveNoReportOrBlock() {
        assertTrue(canModerate(msg("u2"), "me", setOf("bot-1")))
        assertFalse(canModerate(msg("bot-1"), "me", setOf("bot-1")))
        assertFalse(canModerate(msg("me"), "me"))
        assertFalse(canModerate(msg("u2"), null))
    }

    @Test
    fun reportErrorsShowFriendlyText() {
        assertEquals(R.string.s_report_failed_rate, reportFailure(BucketError.RateLimited("raw server text")))
        assertEquals(R.string.s_report_failed_gone, reportFailure(BucketError.NotFound))
        assertEquals(R.string.s_report_failed, reportFailure(BucketError.Server(500, "stack trace")))
    }
}
