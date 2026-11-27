package foundation.bucket.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable(with = LobbyStatusSerializer::class)
enum class LobbyStatus(val wire: String) { Lobby("lobby"), Playing("playing"), Done("done") }

object LobbyStatusSerializer : LenientEnumSerializer<LobbyStatus>("LobbyStatus", LobbyStatus.entries, LobbyStatus::wire, LobbyStatus.Done)

@Serializable(with = LobbyGameSerializer::class)
enum class LobbyGame(val wire: String, val title: String) {
    @SerialName("daily") Daily("daily", "Daily Set"),
    @SerialName("same-word") SameWord("same-word", "Same Word"),
    @SerialName("flags") Flags("flags", "Flags"),
    @SerialName("live") Live("live", "Live Mix"),
    @SerialName("tiles") Tiles("tiles", "Word Tiles"),
    @SerialName("duel") Duel("duel", "Flag Duel"),
    @SerialName("spy") Spy("spy", "I Spy"),
    @SerialName("mini") Mini("mini", "Mini"),
    @SerialName("word-groups") WordGroups("word-groups", "Word Groups"),
    @SerialName("match") Match("match", "Speed Match"),
    @SerialName("voice") Voice("voice", "Which Voice"),
    @SerialName("letters") Letters("letters", "Letter Sprint"),
    @SerialName("polyword") Polyword("polyword", "Polyword"),
    @SerialName("flag-tiles") FlagTiles("flag-tiles", "Flag Tiles"),
    @SerialName("babel") Babel("babel", "Babel Match"),
    @SerialName("shift") Shift("shift", "Shift"),
    @SerialName("snake") Snake("snake", "Word Snake"),
    @SerialName("atlas") Atlas("atlas", "Voice Atlas"),
    @SerialName("forehead") Forehead("forehead", "Forehead"),
    @SerialName("ispy") ISpy("ispy", "I Spy Race"),
    @SerialName("flag-duel") FlagDuel("flag-duel", "Flag Duel Race"),
    Unknown("unknown", "New game");

    val isRace: Boolean get() = this in LobbyGames.race
}

object LobbyGameSerializer : LenientEnumSerializer<LobbyGame>("LobbyGame", LobbyGame.entries, LobbyGame::wire, LobbyGame.Unknown)

@Serializable(with = LobbyPromptModeSerializer::class)
enum class LobbyPromptMode(val wire: String) { Form("form"), Flag("flag"), Tiles("tiles"), Mixed("mixed"), Meaning("meaning"), Spy("spy"), Voice("voice"), Unknown("unknown") }

object LobbyPromptModeSerializer : LenientEnumSerializer<LobbyPromptMode>("LobbyPromptMode", LobbyPromptMode.entries, LobbyPromptMode::wire, LobbyPromptMode.Unknown)

@Serializable(with = PowerKindSerializer::class)
enum class PowerKind(val wire: String, val cost: Int) { Double("double", 2), Fifty("fifty", 1), Unknown("unknown", 0) }

object PowerKindSerializer : LenientEnumSerializer<PowerKind>("PowerKind", PowerKind.entries, PowerKind::wire, PowerKind.Unknown)

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
    val total: Int? = null,
    val firstRound: Int = 0,
    val continues: Int = 0,
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
    val licence: String? = null,
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
    val setup: String = "single",
    val playlist: List<String> = emptyList(),
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
    val ended: Boolean = false,
    val canEnd: Boolean = false,
    val setup: String = "single",
    val playlist: List<String> = emptyList(),
    val guestsWatch: Boolean? = null,
    val bonusVotes: List<BonusTally> = emptyList(),
) {
    val me: LobbyPlayer? get() = players.firstOrNull { it.isMe }
    val seated: Boolean get() = me != null
    val readyCount: Int get() = players.count { it.ready }
    val canStart: Boolean get() = isHost && status == LobbyStatus.Lobby && LobbyRules.allReady(players)
    val waitingOn: List<LobbyPlayer> get() = players.filter { !it.bot && it.online && !it.ready }
    val night: NightRound? get() = FamilyNight.round(playlist, game.wire, setup == "mix")
    fun interlude(nowMs: Long): Interlude? = FamilyNight.interlude(this, nowMs)
    fun nextGameSeconds(nowMs: Long): Int? = if (ended || status != LobbyStatus.Done) null else nextStartAt?.let(::parseInstantMs)?.let { maxOf(0, ((it - nowMs + 999) / 1000).toInt()) }
    fun gameEndMs(): Long? = startedAt?.let(::parseInstantMs)?.let { it + rounds * roundSeconds * 1000L + maxOf(0, rounds - 1) * revealSeconds * 1000L }
    fun bonus(round: Int): BonusTally? = bonusVotes.firstOrNull { it.round == round }
    val standings: List<LobbyPlayer> get() {
        if (!game.isRace) return players.sortedWith(compareByDescending<LobbyPlayer> { it.score }.thenBy { it.name })
        val ms = results.groupBy { it.userId }.mapValues { (_, r) -> r.first().ms }
        return players.sortedWith(compareByDescending<LobbyPlayer> { it.score }.thenBy { ms[it.userId] ?: Int.MAX_VALUE }.thenBy { it.name })
    }
    val raceKey: String get() = LobbyRace.dayKey(seed)
    val playSeconds: Double get() = rounds * roundSeconds + maxOf(0, rounds - 1) * revealSeconds.toDouble()
    val raceFinishers: Set<String> get() = results.map { it.userId }.toSet()
    fun raceRemaining(nowMs: Long): Double = startedAt?.let(::parseInstantMs)?.let { maxOf(0.0, playSeconds - (nowMs - it) / 1000.0) } ?: 0.0
    fun prompt(round: Int) = prompts.firstOrNull { it.round == round }
    fun results(round: Int) = results.filter { it.round == round }
    fun doubled(round: Int) = powers.any { it.round == round && it.kind == PowerKind.Double }
    fun powerFor(round: Int) = powers.firstOrNull { it.round == round }
}

object LobbyGames {
    val prompt = listOf(LobbyGame.Daily, LobbyGame.SameWord, LobbyGame.Flags, LobbyGame.Live, LobbyGame.Duel, LobbyGame.Tiles, LobbyGame.Spy)
    val race = listOf(LobbyGame.Mini, LobbyGame.WordGroups, LobbyGame.Match, LobbyGame.Voice, LobbyGame.Letters, LobbyGame.Polyword, LobbyGame.FlagTiles, LobbyGame.Babel, LobbyGame.Shift, LobbyGame.Snake, LobbyGame.Atlas, LobbyGame.Forehead, LobbyGame.ISpy, LobbyGame.FlagDuel)
    val raceOnAndroid = setOf(LobbyGame.FlagTiles, LobbyGame.Shift, LobbyGame.Atlas)
    const val PLAYS_HEADER = "x-polingual-plays"
    val nativeExtras = listOf(LobbyGame.Tiles, LobbyGame.Duel)
    val plays: String = (nativeExtras.map { it.wire } + "reveal").joinToString(",")
    private val fallback = setOf("daily", "same-word", "flags", "live", "tiles")

    fun offered(server: List<String>, raceServer: List<String> = emptyList()): List<LobbyGame> {
        val allowed = server.ifEmpty { fallback.toList() }.toSet()
        val racing = raceServer.toSet()
        return prompt.filter { it.wire in allowed } + race.filter { it.wire in racing }
    }

    fun playable(game: LobbyGame): Boolean = game != LobbyGame.Unknown && (!game.isRace || game in raceOnAndroid)
}

object LobbyRace {
    const val SCORE_MAX = 100_000
    const val HEADER = "x-polingual-race"

    fun seedValue(seed: String): ULong = seed.toULongOrNull() ?: fnv(seed)

    fun dayKey(seed: String): String = "race-${seedValue(seed)}"

    fun score(points: Int?, hits: Int): Int = (points ?: (hits * 100)).coerceIn(0, SCORE_MAX)

    private fun fnv(text: String): ULong {
        var h = 0xcbf29ce484222325uL
        for (b in text.encodeToByteArray()) {
            h = h xor b.toUByte().toULong()
            h *= 0x100000001b3uL
        }
        return h
    }
}

object LobbyRules {
    const val MIN_READY = 2
    const val CAP = 8
    const val POLL_MS = 1000L
    const val CODE_LENGTH = 6

    fun allReady(players: List<LobbyPlayer>): Boolean {
        val here = players.filter { it.bot || it.online }
        return here.size >= MIN_READY && here.any { !it.bot } && here.all { it.ready || it.bot }
    }
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

enum class ChatReportReason(val wire: String) { OffensiveName("offensive_name"), Harassment("harassment"), Spam("spam"), Other("other") }

@Serializable
data class ChatBlock(val userId: String, val name: String, val at: String = "")

@Serializable
data class ChatBlocksReply(val blocks: List<ChatBlock>)
