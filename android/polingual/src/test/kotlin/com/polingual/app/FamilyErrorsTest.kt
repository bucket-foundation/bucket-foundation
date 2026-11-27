package com.polingual.app

import foundation.bucket.core.model.BucketError
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class FamilyErrorsTest {
    @Test
    fun pollHidesTransientErrorsAndShowsTheRest() {
        assertNull(LobbyErrors.pollProblem(BucketError.Offline))
        assertNull(LobbyErrors.pollProblem(BucketError.Unavailable))
        assertNull(LobbyErrors.pollProblem(BucketError.RateLimited(null)))
        assertNull(LobbyErrors.pollProblem(BucketError.Server(503, "sync_unavailable")))
        assertEquals("Check the details and try again.", LobbyErrors.pollProblem(BucketError.Server(400, "bad_request")))
        assertEquals("Only the host can do that.", LobbyErrors.pollProblem(BucketError.Server(403, "not_host")))
    }

    @Test
    fun atlasGuessCopy() {
        assertEquals("You already placed a pin for this clip.", LobbyErrors.atlasGuess(BucketError.Server(409, "already_answered")))
        assertEquals("That clip is over. Pin the next one.", LobbyErrors.atlasGuess(BucketError.Server(409, "wrong_round")))
        assertEquals("That guess did not count.", LobbyErrors.atlasGuess(BucketError.Offline))
    }
}
