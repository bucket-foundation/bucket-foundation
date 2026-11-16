package com.polingual.app

import foundation.bucket.core.model.BucketError
import kotlin.test.Test
import kotlin.test.assertEquals

class LobbyErrorsTest {
    @Test
    fun serverCodesReadAsWebCopy() {
        assertEquals("You already host three lobbies.", LobbyErrors.text(BucketError.Server(409, "hosted_limit")))
        assertEquals("Not enough coins for that power-up.", LobbyErrors.text(BucketError.Server(409, "no_coins")))
        assertEquals("Bucket answered 500.", LobbyErrors.text(BucketError.Server(500, null)))
    }
}
