package foundation.bucket.core.auth

import foundation.bucket.core.model.GuestTicket
import foundation.bucket.core.model.parseInstantMs
import foundation.bucket.core.net.BucketApi
import kotlinx.coroutines.sync.withLock
import java.util.UUID

interface KeyValue {
    fun get(key: String): String?
    fun set(key: String, value: String?)
}

class MemoryKeyValue : KeyValue {
    private val map = mutableMapOf<String, String>()
    override fun get(key: String) = map[key]
    override fun set(key: String, value: String?) { if (value == null) map.remove(key) else map[key] = value }
}

class GuestPass(
    private val api: BucketApi,
    private val store: KeyValue,
    var nickname: () -> String,
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    private var ticket: GuestTicket? = store.get(TICKET_KEY)?.let { runCatching { api.json.decodeFromString(GuestTicket.serializer(), it) }.getOrNull() }

    val guestId: String
        get() = store.get(ID_KEY) ?: UUID.randomUUID().toString().replace("-", "").lowercase().also { store.set(ID_KEY, it) }

    val userId: String? get() = ticket?.userId

    private val lock = kotlinx.coroutines.sync.Mutex()

    suspend fun token(): String? = lock.withLock { mint() }

    private suspend fun mint(): String? {
        ticket?.let { t ->
            val exp = parseInstantMs(t.expiresAt)
            if (exp != null && exp - nowMs() > 3_600_000) return t.token
        }
        val nick = nickname().trim()
        if (nick.isEmpty()) return null
        val fresh = runCatching { api.guestTicket(nick.take(40), guestId) }.getOrNull() ?: return null
        ticket = fresh
        store.set(TICKET_KEY, api.json.encodeToString(GuestTicket.serializer(), fresh))
        return fresh.token
    }

    suspend fun merge(userToken: String) {
        val t = ticket ?: return
        if (runCatching { api.mergeGuest(userToken, t.token) }.isSuccess) {
            ticket = null
            store.set(TICKET_KEY, null)
        }
    }

    companion object {
        const val ID_KEY = "polingual.guestId"
        const val TICKET_KEY = "polingual.guestTicket"
    }
}
