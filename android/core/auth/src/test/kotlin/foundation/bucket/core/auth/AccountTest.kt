package foundation.bucket.core.auth

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.Session
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AccountTest {
    private val tokens = """{"access_token":"a2","refresh_token":"r2","expires_at":99999,"user_id":"u1"}"""

    @Test
    fun signsInWithEmailCode() = runTest {
        val f = Fake()
        f.routes = { _, body -> if ("\"otp\"" in body) 200 to "{}" else 200 to tokens }
        val vault = MemoryVault()
        val account = Account(f.api, vault)
        account.restore()
        assertEquals(Stage.SignedOut, account.stage.value)
        account.requestCode(" a@b.co ")
        assertEquals(Stage.CodeSent, account.stage.value)
        assertTrue("\"app\":\"polingual\"" in f.calls[0].second)
        account.verify("123456")
        assertEquals(Stage.SignedIn, account.stage.value)
        assertEquals("a2", vault.load()?.accessToken)
        assertTrue("\"email\":\"a@b.co\"" in f.calls[1].second)
    }

    @Test
    fun mapsSessionErrors() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 400 to """{"error":"bad_code"}""" }
        val account = Account(f.api, MemoryVault())
        assertFailsWith<BucketError.BadCode> { account.verify("1") }
        f.routes = { _, _ -> 429 to """{"error":"too_many_requests","message":"Slow down."}""" }
        assertEquals("Slow down.", assertFailsWith<BucketError.RateLimited> { account.requestCode("a@b.co") }.message)
        f.routes = { _, _ -> 400 to """{"error":"bad_email"}""" }
        assertFailsWith<BucketError.BadEmail> { account.requestCode("x") }
    }

    @Test
    fun refreshIsSingleFlightUnderManyCallers() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 200 to tokens }
        val account = Account(f.api, MemoryVault(Session("a1", "r1", 100, "u1")), nowSeconds = { 90 })
        account.restore()
        val results = (1..20).map { async { account.token() } }.awaitAll()
        assertTrue(results.all { it == "a2" })
        assertEquals(1, f.calls.count { "refresh" in it.second })
    }

    @Test
    fun revokedRefreshSignsOut() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 401 to """{"error":"revoked"}""" }
        val vault = MemoryVault(Session("a1", "r1", 0, "u1"))
        val account = Account(f.api, vault, nowSeconds = { 1000 })
        account.restore()
        assertNull(account.token())
        assertEquals(Stage.SignedOut, account.stage.value)
        assertNull(vault.load())
    }

    @Test
    fun deleteAccountCallsSessionAndClears() = runTest {
        val f = Fake()
        f.routes = { _, _ -> 200 to """{"ok":true}""" }
        val vault = MemoryVault(Session("a1", "r1", 99999, "u1"))
        val account = Account(f.api, vault, nowSeconds = { 0 })
        account.restore()
        account.deleteAccount()
        assertTrue("delete_account" in f.calls.single().second)
        assertEquals("Bearer a1", f.auth.single())
        assertNull(vault.load())
        assertEquals(Stage.SignedOut, account.stage.value)
    }
}
