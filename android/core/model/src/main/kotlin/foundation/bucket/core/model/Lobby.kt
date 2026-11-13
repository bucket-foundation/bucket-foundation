package foundation.bucket.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class LobbyStatus { @SerialName("lobby") Lobby, @SerialName("playing") Playing, @SerialName("done") Done }

@Serializable
enum class LobbyGame(val wire: String, val title: String) {
    @SerialName("daily") Daily("daily", "Daily Set"),
    @SerialName("same-word") SameWord("same-word", "Same Word"),
    @SerialName("flags") Flags("flags", "Flags"),
    @SerialName("live") Live("live", "Live"),
}

@Serializable
enum class LobbyPromptMode { @SerialName("form") Form, @SerialName("flag") Flag }

@Serializable
data class LobbyPlayer(
    val userId: String,
    val name: String,
    val ready: Boolean,
    val score: Int,
    val isHost: Boolean,
    val isMe: Boolean,
    val online: Boolean,
    val answered: Boolean,
)

@Serializable
data class LobbyMessage(val id: Int, val from: String, val name: String, val body: String, val at: String)

@Serializable
data class LobbyRound(val index: Int, val startsAt: String, val endsAt: String)

@Serializable
data class LobbyPrompt(
    val round: Int,
    val mode: LobbyPromptMode,
    val lang: String? = null,
    val gloss: String,
    val choices: List<String>,
    val answer: String? = null,
)

@Serializable
data class LobbyResult(val round: Int, val userId: String, val correct: Boolean, val ms: Int, val points: Int)

@Serializable
data class LobbySummary(
    val id: String,
    val code: String,
    val name: String,
    val game: LobbyGame,
    val root: String,
    val targets: List<String>,
    val status: LobbyStatus,
    val players: Int,
    val host: String,
    val isMember: Boolean,
)

@Serializable
data class Lobby(
    val id: String,
    val code: String,
    val name: String,
    val game: LobbyGame,
    val root: String,
    val targets: List<String>,
    val seed: String,
    val status: LobbyStatus,
    val listed: Boolean,
    val rounds: Int,
    val roundSeconds: Int,
    val startedAt: String? = null,
    val version: Int,
    val now: String,
    val isHost: Boolean,
    val players: List<LobbyPlayer>,
    val messages: List<LobbyMessage>,
    val round: LobbyRound? = null,
    val prompts: List<LobbyPrompt>,
    val results: List<LobbyResult>,
) {
    val me: LobbyPlayer? get() = players.firstOrNull { it.isMe }
    val readyCount: Int get() = players.count { it.ready }
    val canStart: Boolean get() = isHost && status == LobbyStatus.Lobby && readyCount >= LobbyRules.MIN_READY
    val standings: List<LobbyPlayer> get() = players.sortedWith(compareByDescending<LobbyPlayer> { it.score }.thenBy { it.name })
    fun prompt(round: Int) = prompts.firstOrNull { it.round == round }
    fun results(round: Int) = results.filter { it.round == round }
}

object LobbyRules {
    const val MIN_READY = 2
    const val CAP = 8
    const val POLL_MS = 1000L
    const val CODE_LENGTH = 6
}

sealed interface LobbyPhase {
    data object Waiting : LobbyPhase
    data class Countdown(val seconds: Double) : LobbyPhase
    data class Round(val index: Int, val remaining: Double) : LobbyPhase
    data object Finished : LobbyPhase
}

object LobbyClock {
    fun phase(lobby: Lobby, nowMs: Long): LobbyPhase = when (lobby.status) {
        LobbyStatus.Lobby -> LobbyPhase.Waiting
        LobbyStatus.Done -> LobbyPhase.Finished
        LobbyStatus.Playing -> {
            val start = lobby.startedAt?.let(::parseInstantMs)
            if (start == null) LobbyPhase.Waiting else {
                val elapsed = (nowMs - start) / 1000.0
                val len = lobby.roundSeconds.toDouble()
                when {
                    elapsed < 0 -> LobbyPhase.Countdown(-elapsed)
                    (elapsed / len).toInt() >= lobby.rounds -> LobbyPhase.Finished
                    else -> {
                        val index = (elapsed / len).toInt()
                        LobbyPhase.Round(index, len * (index + 1) - elapsed)
                    }
                }
            }
        }
    }
}

fun parseInstantMs(text: String): Long? = runCatching { java.time.Instant.parse(text).toEpochMilli() }.getOrNull()
    ?: runCatching { java.time.OffsetDateTime.parse(text).toInstant().toEpochMilli() }.getOrNull()
