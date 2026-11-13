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
    @SerialName("live") Live("live", "Live Mix"),
    @SerialName("tiles") Tiles("tiles", "Word Tiles"),
    @SerialName("duel") Duel("duel", "Flag Duel"),
    @SerialName("spy") Spy("spy", "I Spy"),
}

@Serializable
enum class LobbyPromptMode { @SerialName("form") Form, @SerialName("flag") Flag, @SerialName("tiles") Tiles, @SerialName("mixed") Mixed, @SerialName("meaning") Meaning, @SerialName("spy") Spy }

@Serializable
enum class PowerKind(val cost: Int) { @SerialName("double") Double(2), @SerialName("fifty") Fifty(1) }

@Serializable
data class LobbyPower(val round: Int, val kind: PowerKind)

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
    val handle: String? = null,
    val bot: Boolean = false,
    val skill: String? = null,
    val flag: String? = null,
)

@Serializable
data class LobbyMessage(val id: Int, val from: String, val name: String, val body: String, val at: String)

@Serializable
data class LobbyRound(val index: Int, val startsAt: String, val endsAt: String, val reveal: Boolean = false)

@Serializable
data class RevealEntry(val lang: String, val word: String, val roman: String? = null, val meaning: String = "", val gloss: String = "", val correct: Boolean = false)

@Serializable
data class LobbyPrompt(
    val round: Int,
    val mode: LobbyPromptMode,
    val lang: String? = null,
    val gloss: String,
    val choices: List<String>,
    val answer: String? = null,
    val reveal: List<RevealEntry> = emptyList(),
    val hide: List<String> = emptyList(),
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
    val bots: Int = 0,
    val standing: Boolean = false,
    val hostHandle: String? = null,
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
    val revealSeconds: Int = 0,
    val startedAt: String? = null,
    val version: Int,
    val now: String,
    val isHost: Boolean,
    val players: List<LobbyPlayer>,
    val messages: List<LobbyMessage>,
    val round: LobbyRound? = null,
    val prompts: List<LobbyPrompt>,
    val results: List<LobbyResult>,
    val standing: Boolean = false,
    val botFill: Boolean = false,
    val botsEnabled: Boolean = false,
    val nextStartAt: String? = null,
    val coins: Int = 0,
    val powers: List<LobbyPower> = emptyList(),
) {
    val me: LobbyPlayer? get() = players.firstOrNull { it.isMe }
    val readyCount: Int get() = players.count { it.ready }
    val canStart: Boolean get() = isHost && status == LobbyStatus.Lobby && readyCount >= LobbyRules.MIN_READY
    val standings: List<LobbyPlayer> get() = players.sortedWith(compareByDescending<LobbyPlayer> { it.score }.thenBy { it.name })
    fun prompt(round: Int) = prompts.firstOrNull { it.round == round }
    fun results(round: Int) = results.filter { it.round == round }
    fun doubled(round: Int) = powers.any { it.round == round && it.kind == PowerKind.Double }
    fun powerFor(round: Int) = powers.firstOrNull { it.round == round }
}

object LobbyGames {
    val native = listOf(LobbyGame.Daily, LobbyGame.SameWord, LobbyGame.Flags, LobbyGame.Live, LobbyGame.Duel, LobbyGame.Tiles)
    private val fallback = setOf("daily", "same-word", "flags", "live", "tiles")

    fun offered(server: List<String>): List<LobbyGame> {
        val allowed = server.ifEmpty { fallback.toList() }.toSet()
        return native.filter { it.wire in allowed }
    }
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
    data class Reveal(val index: Int, val remaining: Double) : LobbyPhase
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
                val slot = len + lobby.revealSeconds
                val index = if (elapsed < 0) 0 else (elapsed / slot).toInt()
                when {
                    elapsed < 0 -> LobbyPhase.Countdown(-elapsed)
                    index >= lobby.rounds -> LobbyPhase.Finished
                    elapsed - index * slot >= len -> LobbyPhase.Reveal(index, slot * (index + 1) - elapsed)
                    else -> LobbyPhase.Round(index, len - (elapsed - index * slot))
                }
            }
        }
    }
}

fun parseInstantMs(text: String): Long? = runCatching { java.time.Instant.parse(text).toEpochMilli() }.getOrNull()
    ?: runCatching { java.time.OffsetDateTime.parse(text).toInstant().toEpochMilli() }.getOrNull()

object InterstitialPacer {
    const val MIN_GAP_MS = 180_000L

    fun due(finishedGame: Boolean, lastShownMs: Long?, gamesFinished: Int, nowMs: Long): Boolean =
        finishedGame && gamesFinished >= 2 && (lastShownMs == null || nowMs - lastShownMs >= MIN_GAP_MS)
}
