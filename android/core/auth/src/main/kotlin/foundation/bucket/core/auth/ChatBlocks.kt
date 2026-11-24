package foundation.bucket.core.auth

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.LobbyMessage
import foundation.bucket.core.net.BucketApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class ChatIdentity(val userId: String, val token: String)

class ChatBlocks(
    private val store: KeyValue,
    private val api: BucketApi,
    private val identity: suspend () -> ChatIdentity?,
) {
    private var owner: String? = null
    private val _blocked = MutableStateFlow<Set<String>>(emptySet())
    val blocked: StateFlow<Set<String>> = _blocked

    suspend fun sync() {
        val me = switch() ?: return
        try {
            pending(me.userId).forEach { (id, on) -> api.setChatBlock(me.token, id, "Player", on) }
            store.set(pendingKey(me.userId), null)
            save(me.userId, api.chatBlocks(me.token).map { it.userId }.toSet())
        } catch (_: BucketError) {
        }
    }

    suspend fun block(userId: String, name: String) = set(userId, name.take(60).ifBlank { "Player" }, true)

    suspend fun unblock(userId: String) = set(userId, "Player", false)

    fun visible(messages: List<LobbyMessage>, blocked: Set<String> = _blocked.value): List<LobbyMessage> =
        messages.filterNot { it.from in blocked }

    private suspend fun set(userId: String, name: String, on: Boolean) {
        val me = switch() ?: return
        save(me.userId, if (on) _blocked.value + userId else _blocked.value - userId)
        try {
            save(me.userId, api.setChatBlock(me.token, userId, name, on).map { it.userId }.toSet())
        } catch (_: BucketError) {
            store.set(pendingKey(me.userId), encodePending(pending(me.userId) + (userId to on)))
        }
    }

    private suspend fun switch(): ChatIdentity? {
        val me = identity()
        if (me?.userId != owner) {
            owner = me?.userId
            _blocked.value = me?.let { read(it.userId) }.orEmpty()
        }
        return me
    }

    private fun read(owner: String): Set<String> =
        store.get(cacheKey(owner))?.split('\n')?.filter { it.isNotBlank() }?.toSet().orEmpty()

    private fun pending(owner: String): Map<String, Boolean> =
        store.get(pendingKey(owner))?.split('\n')?.filter { it.length > 1 }?.associate { it.drop(1) to (it[0] == '+') }.orEmpty()

    private fun encodePending(ops: Map<String, Boolean>): String? =
        ops.entries.joinToString("\n") { (id, on) -> (if (on) "+" else "-") + id }.ifEmpty { null }

    private fun save(owner: String, next: Set<String>) {
        store.set(cacheKey(owner), next.sorted().joinToString("\n").ifEmpty { null })
        if (owner == this.owner) _blocked.value = next
    }

    companion object {
        const val KEY = "lobby.blockedPlayers"
        fun cacheKey(owner: String) = "$KEY.$owner"
        fun pendingKey(owner: String) = "$KEY.pending.$owner"
    }
}
