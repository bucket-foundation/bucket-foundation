package foundation.bucket.core.auth

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GuestMergedTest {
    @Test
    fun aMergedGuestIdIsReplacedAndTheNewTicketKept() = runTest {
        val f = Fake()
        val kv = MemoryKeyValue().apply { set(GuestPass.ID_KEY, "oldid") }
        f.routes = { _, body ->
            if ("\"guestId\":\"oldid\"" in body) 409 to """{"error":"guest_merged"}"""
            else 200 to """{"token":"g2","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}"""
        }
        val guest = GuestPass(f.api, kv, nickname = { "Ana" }, nowMs = { 0 })
        assertEquals("g2", guest.token())
        assertNotEquals("oldid", kv.get(GuestPass.ID_KEY))
        assertEquals(2, f.calls.size)
        assertTrue(kv.get(GuestPass.TICKET_KEY)!!.contains("g2"))
    }

    @Test
    fun otherGuestErrorsKeepTheId() = runTest {
        val f = Fake()
        val kv = MemoryKeyValue().apply { set(GuestPass.ID_KEY, "keep") }
        f.routes = { _, _ -> 429 to """{"error":"rate_limited"}""" }
        val guest = GuestPass(f.api, kv, nickname = { "Ana" }, nowMs = { 0 })
        assertNull(guest.token())
        assertEquals("keep", kv.get(GuestPass.ID_KEY))
        assertEquals(1, f.calls.size)
    }

    @Test
    fun signedInWithAMergedGuestClearsTheTicket() = runTest {
        val f = Fake()
        var merged = false
        f.routes = { path, _ -> if (path.endsWith("merge")) 409 to """{"error":"guest_merged"}""" else 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}""" }
        val kv = MemoryKeyValue()
        val guest = GuestPass(f.api, kv, nickname = { "Ana" }, nowMs = { 0 })
        guest.token()
        guest.merge("user")
        merged = kv.get(GuestPass.TICKET_KEY) == null
        assertTrue(merged)
    }

    @Test
    fun aFailedMergeForAnotherReasonKeepsTheTicket() = runTest {
        val f = Fake()
        f.routes = { path, _ -> if (path.endsWith("merge")) 503 to """{"error":"sync_unavailable"}""" else 200 to """{"token":"g1","userId":"g","expiresAt":"2026-11-13T10:00:00Z"}""" }
        val kv = MemoryKeyValue()
        val guest = GuestPass(f.api, kv, nickname = { "Ana" }, nowMs = { 0 })
        guest.token()
        guest.merge("user")
        assertTrue(kv.get(GuestPass.TICKET_KEY) != null)
    }
}
