package foundation.bucket.core.auth

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.LobbyMessage
import foundation.bucket.core.net.BucketApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ChatBlocks(
    private val store: KeyValue,
    private val api: BucketApi? = null,
    private val token: suspend () -> String? = { null },
) {
    private val _blocked = MutableStateFlow(read())
    val blocked: StateFlow<Set<String>> = _blocked

    private fun read(): Set<String> = store.get(KEY)?.split('\n')?.filter { it.isNotBlank() }?.toSet().orEmpty()

    suspend fun sync() {
        val a = api ?: return
        val t = token() ?: return
        try {
            val remote = a.chatBlocks(t).map { it.userId }.toSet()
            (_blocked.value - remote).forEach { a.setChatBlock(t, it, "Player", true) }
            save(remote + _blocked.value)
        } catch (_: BucketError) {
        }
    }

    suspend fun block(userId: String, name: String) {
        save(_blocked.value + userId)
        remote { a, t -> a.setChatBlock(t, userId, name.take(60).ifBlank { "Player" }, true) }
    }

    suspend fun unblock(userId: String) {
        save(_blocked.value - userId)
        remote { a, t -> a.setChatBlock(t, userId, "Player", false) }
    }

    fun visible(messages: List<LobbyMessage>, blocked: Set<String> = _blocked.value): List<LobbyMessage> =
        messages.filterNot { it.from in blocked }

    private suspend fun remote(op: suspend (BucketApi, String) -> Unit) {
        val a = api ?: return
        val t = token() ?: return
        try { op(a, t) } catch (_: BucketError) { }
    }

    private fun save(next: Set<String>) {
        store.set(KEY, next.sorted().joinToString("\n").ifEmpty { null })
        _blocked.value = next
    }

    companion object {
        const val KEY = "lobby.blockedPlayers"
    }
}
