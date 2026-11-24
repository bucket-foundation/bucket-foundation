package foundation.bucket.core.auth

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.LobbyMessage
import foundation.bucket.core.net.BucketApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class ChatIdentity(val userId: String, val token: String)

data class QueuedBlock(val on: Boolean, val name: String)

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
        val left = pending(me.userId).toMutableMap()
        for ((id, op) in left.toMap()) {
            try {
                api.setChatBlock(me.token, id, op.name, op.on)
                left -= id
            } catch (e: BucketError) {
                if (!rejected(e)) break
                left -= id
            }
        }
        writePending(me.userId, left)
        try {
            save(me.userId, overlay(api.chatBlocks(me.token).map { it.userId }.toSet(), left))
        } catch (_: BucketError) {
            save(me.userId, overlay(read(me.userId), left))
        }
    }

    suspend fun block(userId: String, name: String) = set(userId, name.take(60).ifBlank { "Player" }, true)

    suspend fun unblock(userId: String, name: String = "Player") = set(userId, name.take(60).ifBlank { "Player" }, false)

    fun visible(messages: List<LobbyMessage>, blocked: Set<String> = _blocked.value): List<LobbyMessage> =
        messages.filterNot { it.from in blocked }

    private suspend fun set(userId: String, name: String, on: Boolean) {
        val me = switch() ?: return
        save(me.userId, if (on) _blocked.value + userId else _blocked.value - userId)
        val queued = pending(me.userId)
        try {
            val remote = api.setChatBlock(me.token, userId, name, on).map { it.userId }.toSet()
            val left = queued - userId
            writePending(me.userId, left)
            save(me.userId, overlay(remote, left))
        } catch (e: BucketError) {
            if (rejected(e)) {
                save(me.userId, if (on) _blocked.value - userId else _blocked.value + userId)
            } else {
                writePending(me.userId, queued + (userId to QueuedBlock(on, name)))
            }
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

    private fun rejected(e: BucketError): Boolean = when (e) {
        is BucketError.Server -> e.status in 400..499 && e.status != 429
        is BucketError.NotFound, is BucketError.Decoding -> true
        else -> false
    }

    private fun overlay(remote: Set<String>, queued: Map<String, QueuedBlock>): Set<String> =
        remote + queued.filterValues { it.on }.keys - queued.filterValues { !it.on }.keys

    private fun read(owner: String): Set<String> =
        store.get(cacheKey(owner))?.split('\n')?.filter { it.isNotBlank() }?.toSet().orEmpty()

    private fun pending(owner: String): Map<String, QueuedBlock> =
        store.get(pendingKey(owner))?.split('\n')?.mapNotNull { line ->
            val parts = line.split('\t', limit = 2)
            val head = parts[0]
            if (head.length < 2) null else head.drop(1) to QueuedBlock(head[0] == '+', parts.getOrNull(1)?.ifBlank { null } ?: "Player")
        }?.toMap().orEmpty()

    private fun writePending(owner: String, ops: Map<String, QueuedBlock>) {
        store.set(pendingKey(owner), ops.entries.joinToString("\n") { (id, op) -> (if (op.on) "+" else "-") + id + "\t" + op.name.replace('\n', ' ').replace('\t', ' ') }.ifEmpty { null })
    }

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
