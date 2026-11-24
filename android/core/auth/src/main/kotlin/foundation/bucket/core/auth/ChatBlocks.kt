package foundation.bucket.core.auth

import foundation.bucket.core.model.LobbyMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ChatBlocks(private val store: KeyValue) {
    private val _blocked = MutableStateFlow(read())
    val blocked: StateFlow<Set<String>> = _blocked

    private fun read(): Set<String> = store.get(KEY)?.split('\n')?.filter { it.isNotBlank() }?.toSet().orEmpty()

    fun block(userId: String) = save(_blocked.value + userId)

    fun unblock(userId: String) = save(_blocked.value - userId)

    fun visible(messages: List<LobbyMessage>, blocked: Set<String> = _blocked.value): List<LobbyMessage> =
        messages.filterNot { it.from in blocked }

    private fun save(next: Set<String>) {
        store.set(KEY, next.sorted().joinToString("\n").ifEmpty { null })
        _blocked.value = next
    }

    companion object {
        const val KEY = "lobby.blockedPlayers"
    }
}
