package com.polingual.app

import foundation.bucket.core.auth.Account
import foundation.bucket.core.auth.MemoryVault
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.net.BucketApi
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.http.HttpHeaders
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import java.security.SecureRandom
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SaveProgressTest {
    @Test
    fun sheetOnlyForPendingSignedOut() {
        assertTrue(SaveProgress.shown(pending = true, signedIn = false))
        assertFalse(SaveProgress.shown(pending = true, signedIn = true))
        assertFalse(SaveProgress.shown(pending = false, signedIn = false))
        assertTrue(SaveProgress.offer(signedIn = false))
    }

    @Test
    fun googleSkippedWithoutClientId() {
        assertFalse(GoogleSignIn.available(""))
        assertTrue(GoogleSignIn.available("123.apps.googleusercontent.com"))
    }

    @Test
    fun nonceIsHashedForGoogle() {
        val raw = GoogleSignIn.nonce(SecureRandom())
        assertEquals(32, raw.length)
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", GoogleSignIn.hashed("abc"))
    }

    @Test
    fun googleTokenGoesToSessionEndpoint() = runTest {
        var body = ""
        val engine = MockEngine { req ->
            body = String(req.body.toByteArray())
            respond("""{"access_token":"a","refresh_token":"r","expires_at":9999999999,"user_id":"u"}""", headers = headersOf(HttpHeaders.ContentType, "application/json"))
        }
        val account = Account(BucketApi(HttpClient(engine), "https://x.test"), MemoryVault())
        account.signInWithGoogle("tok", "raw")
        assertEquals(Stage.SignedIn, account.stage.value)
        assertTrue(body.contains("\"action\":\"google\"") && body.contains("\"id_token\":\"tok\"") && body.contains("\"nonce\":\"raw\""))
    }

    @Test
    fun signInErrorsMapToLocalizedStrings() {
        assertEquals(R.string.signin_offline, SignInErrors.message(foundation.bucket.core.model.BucketError.Offline))
        assertEquals(R.string.signin_unavailable, SignInErrors.message(foundation.bucket.core.model.BucketError.Server(500, "boom")))
        assertEquals(R.string.signin_rate_limited, SignInErrors.message(foundation.bucket.core.model.BucketError.RateLimited(null)))
        assertEquals(R.string.signin_failed, SignInErrors.message(IllegalStateException("x")))
    }
}
