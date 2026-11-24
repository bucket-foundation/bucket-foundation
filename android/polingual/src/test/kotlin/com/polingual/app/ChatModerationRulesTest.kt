package com.polingual.app

import foundation.bucket.core.model.LobbyMessage
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
}
