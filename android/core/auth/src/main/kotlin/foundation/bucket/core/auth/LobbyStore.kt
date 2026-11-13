package foundation.bucket.core.auth

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.Lobby
import foundation.bucket.core.model.LobbyClock
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyPhase
import foundation.bucket.core.model.LobbyRules
import foundation.bucket.core.model.LobbySummary
import foundation.bucket.core.model.parseInstantMs
import foundation.bucket.core.net.BucketApi
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive

data class LobbyState(
    val open: List<LobbySummary> = emptyList(),
    val current: Lobby? = null,
    val picks: Map<Int, String> = emptyMap(),
    val marks: Map<Int, Boolean> = emptyMap(),
    val busy: Boolean = false,
    val error: BucketError? = null,
    val offsetMs: Long = 0,
)

class LobbyStore(
    private val api: BucketApi,
    private val userToken: suspend () -> String?,
    val guest: GuestPass?,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val _state = MutableStateFlow(LobbyState())
    val state: StateFlow<LobbyState> = _state

    val nowMs: Long get() = clock() + _state.value.offsetMs
    val phase: LobbyPhase get() = _state.value.current?.let { LobbyClock.phase(it, nowMs) } ?: LobbyPhase.Waiting

    private suspend fun anyToken(): String? = userToken() ?: guest?.token()

    suspend fun mergeGuest() {
        val t = userToken() ?: return
        guest?.merge(t)
    }

    suspend fun refresh() {
        val t = anyToken() ?: return
        try {
            val open = api.lobbies(t)
            _state.update { it.copy(open = open, error = null) }
        } catch (e: BucketError) {
            _state.update { it.copy(error = e) }
        }
    }

    suspend fun create(name: String, game: LobbyGame, root: String, targets: List<String>, displayName: String, rounds: Int = 8, roundSeconds: Int = 10, listed: Boolean = true): Lobby =
        enter(run { api.createLobby(it, name, game, root, targets, rounds, roundSeconds, listed, displayName) })

    suspend fun join(code: String, displayName: String): Lobby =
        enter(run { api.joinLobby(it, code = normalizeCode(code), displayName = displayName) })

    suspend fun join(summary: LobbySummary, displayName: String): Lobby =
        enter(run { api.joinLobby(it, lobbyId = summary.id, displayName = displayName) })

    suspend fun leave() {
        val id = _state.value.current?.id ?: return
        _state.update { s -> s.copy(current = null, picks = emptyMap(), marks = emptyMap(), open = s.open.filterNot { it.id == id }) }
        anyToken()?.let { t -> runCatching { api.leaveLobby(t, id) } }
    }

    suspend fun setReady(ready: Boolean) {
        val id = _state.value.current?.id ?: return
        apply(run { api.setReady(it, id, ready) })
    }

    suspend fun start() {
        val id = _state.value.current?.id ?: return
        apply(run { api.startLobby(it, id) })
    }

    suspend fun send(text: String) {
        val body = text.trim()
        val id = _state.value.current?.id ?: return
        if (body.isEmpty()) return
        apply(run { api.chat(it, id, body.take(200)) })
    }

    suspend fun pick(choice: String, round: Int): Boolean? {
        val id = _state.value.current?.id ?: return null
        if (_state.value.picks.containsKey(round)) return null
        val t = anyToken() ?: return null
        _state.update { it.copy(picks = it.picks + (round to choice)) }
        val reply = try {
            api.answer(t, id, round, choice)
        } catch (e: BucketError) {
            if (e != BucketError.Server(409, "already_answered")) _state.update { it.copy(picks = it.picks - round) }
            return null
        }
        _state.update { it.copy(marks = it.marks + (round to reply.correct)) }
        apply(reply.lobby)
        return reply.correct
    }

    suspend fun poll() {
        val lobby = _state.value.current ?: return
        val t = anyToken() ?: return
        try {
            val r = api.lobbyState(t, lobby.id, lobby.version)
            r.now?.let(::parseInstantMs)?.let(::sync)
            val fresh = r.lobby
            if (r.changed && fresh != null && fresh.id == _state.value.current?.id) apply(fresh)
            _state.update { it.copy(error = null) }
        } catch (e: BucketError) {
            if (e == BucketError.NotFound) _state.update { it.copy(current = null) }
            _state.update { it.copy(error = e) }
        }
    }

    suspend fun follow() {
        while (currentCoroutineContext().isActive && _state.value.current != null) {
            poll()
            delay(LobbyRules.POLL_MS)
        }
    }

    private fun sync(serverMs: Long) {
        _state.update { it.copy(offsetMs = serverMs - clock()) }
    }

    private fun enter(lobby: Lobby): Lobby {
        _state.update { it.copy(current = lobby, picks = emptyMap(), marks = emptyMap()) }
        parseInstantMs(lobby.now)?.let(::sync)
        return lobby
    }

    private fun apply(lobby: Lobby) {
        _state.update { if (it.current?.id == lobby.id) it.copy(current = lobby) else it }
    }

    private suspend fun <T> run(block: suspend (String) -> T): T {
        val t = anyToken() ?: throw BucketError.Revoked
        _state.update { it.copy(busy = true) }
        try {
            return block(t).also { _state.update { s -> s.copy(error = null) } }
        } catch (e: BucketError) {
            _state.update { it.copy(error = e) }
            throw e
        } finally {
            _state.update { it.copy(busy = false) }
        }
    }

    companion object {
        fun normalizeCode(code: String) = code.filter { it.isLetterOrDigit() }.uppercase().take(LobbyRules.CODE_LENGTH)
    }
}
