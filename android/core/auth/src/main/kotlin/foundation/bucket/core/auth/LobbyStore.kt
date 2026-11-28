package foundation.bucket.core.auth

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.ChatReportReason
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
    val botsEnabled: Boolean = false,
    val games: List<String> = emptyList(),
    val race: List<String> = emptyList(),
    val raceScore: Int? = null,
    val raceScoreSent: Boolean = false,
    val current: Lobby? = null,
    val picks: Map<Int, String> = emptyMap(),
    val marks: Map<Int, Boolean> = emptyMap(),
    val busy: Boolean = false,
    val error: BucketError? = null,
    val offsetMs: Long = 0,
    val audience: Boolean = false,
    val votes: Map<Int, String> = emptyMap(),
    val left: foundation.bucket.core.model.LeaveResult? = null,
    val card: foundation.bucket.core.model.PlayerCard? = null,
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
            val reply = api.lobbies(t)
            _state.update { it.copy(open = reply.lobbies, botsEnabled = reply.bots, games = reply.games, race = reply.race, error = null) }
        } catch (e: BucketError) {
            _state.update { it.copy(error = e) }
        }
    }

    suspend fun create(name: String, game: LobbyGame, root: String, targets: List<String>, displayName: String, rounds: Int = 8, roundSeconds: Int = 10, listed: Boolean = true): Lobby {
        if (!foundation.bucket.core.model.LobbyGames.playable(game)) throw BucketError.Server(409, UNPLAYABLE)
        return enter(run { api.createLobby(it, name, game, root, targets, rounds, roundSeconds, listed, displayName) })
    }

    suspend fun join(code: String, displayName: String): Lobby =
        enter(run { api.joinLobby(it, code = normalizeCode(code), displayName = displayName) })

    suspend fun join(summary: LobbySummary, displayName: String): Lobby =
        enter(run { api.joinLobby(it, lobbyId = summary.id, displayName = displayName) })

    suspend fun watch(code: String, displayName: String): Lobby {
        val lobby = enter(run { api.joinLobby(it, code = normalizeCode(code), displayName = displayName, audience = true) })
        _state.update { it.copy(audience = lobby.me == null && !lobby.isHost) }
        return lobby
    }

    suspend fun leave(): foundation.bucket.core.model.LeaveResult? {
        val id = _state.value.current?.id ?: return null
        _state.update { s -> s.copy(current = null, picks = emptyMap(), marks = emptyMap(), raceScore = null, raceScoreSent = false, audience = false, votes = emptyMap(), open = s.open.filterNot { it.id == id }) }
        val result = anyToken()?.let { t -> runCatching { api.leaveLobby(t, id) }.getOrNull() }
        _state.update { it.copy(left = result) }
        return result
    }

    suspend fun nextGame() {
        val id = hosted() ?: return
        apply(run { api.nextGame(it, id) })
    }

    suspend fun close() {
        val id = hosted() ?: return
        apply(run { api.closeLobby(it, id) })
    }

    suspend fun settings(game: LobbyGame? = null, setup: String? = null, games: List<String> = emptyList(), guestsWatch: Boolean? = null) {
        val id = hosted() ?: return
        apply(run { api.lobbySettings(it, id, game, setup, games, guestsWatch) })
    }

    suspend fun hostMode(screen: Boolean, displayName: String?) {
        val id = hosted() ?: return
        apply(run { api.hostMode(it, id, screen, displayName) })
    }

    suspend fun vote(round: Int, choice: String): Boolean {
        val id = _state.value.current?.id ?: return false
        if (_state.value.votes.containsKey(round)) return false
        _state.update { it.copy(votes = it.votes + (round to choice)) }
        return try {
            run { api.bonusVote(it, id, round, choice) }
            true
        } catch (e: BucketError) {
            if (e != BucketError.Server(409, "already_voted")) _state.update { it.copy(votes = it.votes - round) }
            false
        }
    }

    suspend fun saveCard(card: foundation.bucket.core.model.PlayerCard) {
        val id = _state.value.current?.id ?: return
        run { api.saveCard(it, id, card) }
        _state.update { it.copy(card = card) }
    }

    suspend fun <T> room(block: suspend BucketApi.(token: String, lobbyId: String) -> T): T {
        val id = _state.value.current?.id ?: throw BucketError.NotFound
        val t = anyToken() ?: throw BucketError.Revoked
        return api.block(t, id)
    }

    suspend fun league(): foundation.bucket.core.model.LeagueBoard {
        val t = userToken() ?: throw BucketError.Revoked
        return api.league(t)
    }

    private fun hosted(): String? = _state.value.current?.takeIf { it.isHost }?.id

    suspend fun setReady(ready: Boolean) {
        val id = _state.value.current?.id ?: return
        apply(run { api.setReady(it, id, ready) })
    }

    suspend fun fillBots() {
        val id = _state.value.current?.id ?: return
        apply(run { api.fillBots(it, id) })
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

    suspend fun power(kind: foundation.bucket.core.model.PowerKind) {
        val id = _state.value.current?.id ?: return
        apply(run { api.power(it, id, kind) })
    }

    suspend fun postScore(score: Int): Boolean {
        val lobby = _state.value.current ?: return false
        if (!lobby.game.isRace || lobby.status != foundation.bucket.core.model.LobbyStatus.Playing) return false
        if (_state.value.raceScore == null) _state.update { it.copy(raceScore = score.coerceIn(0, foundation.bucket.core.model.LobbyRace.SCORE_MAX), raceScoreSent = false) }
        val s = _state.value
        val value = s.raceScore ?: return false
        if (s.raceScoreSent) return true
        val t = anyToken() ?: return false
        return try {
            apply(api.raceScore(t, lobby.id, value))
            _state.update { it.copy(raceScoreSent = true) }
            true
        } catch (e: BucketError) {
            if (scoreFinal(e)) _state.update { it.copy(raceScoreSent = true) }
            false
        }
    }

    suspend fun report(messageId: Int, reason: ChatReportReason) {
        val id = _state.value.current?.id ?: return
        run { api.reportLobbyMessage(it, id, messageId, reason.wire) }
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
        _state.value.raceScore?.let { if (!_state.value.raceScoreSent) postScore(it) }
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
        _state.update { it.copy(current = lobby, picks = emptyMap(), marks = emptyMap(), raceScore = null, raceScoreSent = false, audience = false, votes = emptyMap(), left = null) }
        parseInstantMs(lobby.now)?.let(::sync)
        return lobby
    }

    private fun apply(lobby: Lobby) {
        _state.update { s ->
            val prior = s.current
            if (prior?.id != lobby.id) s
            else if (prior.startedAt != lobby.startedAt) s.copy(current = lobby, picks = emptyMap(), marks = emptyMap(), raceScore = null, raceScoreSent = false, votes = emptyMap())
            else s.copy(current = lobby)
        }
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
        const val UNPLAYABLE = "This race plays on the web and iPhone. Pick another game to host from Android."

        fun scoreFinal(e: BucketError): Boolean = e == BucketError.Revoked || e == BucketError.NotFound || (e is BucketError.Server && e.status in 400..499 && e.status !in setOf(408, 425, 429))

        fun normalizeCode(code: String) = code.filter { it.isLetterOrDigit() }.uppercase().take(LobbyRules.CODE_LENGTH)
    }
}
