package foundation.bucket.core.model

import kotlinx.serialization.Serializable

@Serializable
data class BonusChoice(val choice: String, val votes: Int)

@Serializable
data class BonusTally(val round: Int, val choices: List<BonusChoice> = emptyList(), val total: Int = 0) {
    val leader: String? get() = choices.maxByOrNull { it.votes }?.takeIf { it.votes > 0 }?.choice
    fun share(choice: String): Double = if (total == 0) 0.0 else (choices.firstOrNull { it.choice == choice }?.votes ?: 0).toDouble() / total
}

data class NightRound(val index: Int, val label: String, val final: Boolean, val total: Int)

sealed interface Interlude {
    data class VoiceAtlas(val clip: Int, val endsAtMs: Long) : Interlude
    data object FamilyTeach : Interlude
    data class Forehead(val card: Int, val endsAtMs: Long) : Interlude
    data object OurTrivia : Interlude
}

object FamilyNight {
    val games = listOf("daily" to "Warm Up", "tiles" to "Picture Race", "same-word" to "Final")
    const val BREAK_MS = 150_000L
    const val ATLAS_CLIPS = 5
    const val ATLAS_SLOT_MS = 12_000L
    const val FOREHEAD_MS = 90_000L
    const val FOREHEAD_CARD_MS = 15_000L

    fun round(playlist: List<String>, game: String, mix: Boolean): NightRound? {
        if (mix || playlist != games.map { it.first }) return null
        val index = playlist.indexOf(game)
        if (index < 0) return null
        return NightRound(index, games[index].second, index == games.size - 1, games.size)
    }

    fun interlude(lobby: Lobby, nowMs: Long): Interlude? {
        if (lobby.status != LobbyStatus.Done || lobby.ended) return null
        val night = lobby.night ?: return null
        if (night.final) return null
        val end = lobby.gameEndMs() ?: return null
        val since = nowMs - end
        if (since < 0) return null
        if (night.index == 0) {
            val clip = (since / ATLAS_SLOT_MS).toInt()
            return if (clip < ATLAS_CLIPS) Interlude.VoiceAtlas(clip, end + (clip + 1) * ATLAS_SLOT_MS) else Interlude.FamilyTeach
        }
        if (since >= FOREHEAD_MS) return Interlude.OurTrivia
        val card = (since / FOREHEAD_CARD_MS).toInt()
        return Interlude.Forehead(card, end + (card + 1) * FOREHEAD_CARD_MS)
    }

    fun foreheadHolder(players: List<LobbyPlayer>, card: Int): String? {
        val humans = players.filterNot { it.bot }.map { it.userId }.sorted()
        return if (humans.isEmpty()) null else humans[card % humans.size]
    }

    fun bonusRound(lobby: Lobby, round: Int): Boolean = lobby.status == LobbyStatus.Playing && lobby.night?.final == true && round == lobby.rounds - 1
}

enum class SeatBand(val wire: String, val label: String) { Under13("under13", "Under 13"), Teen("teen", "13 to 17"), Adult("adult", "18 and over") }

@Serializable
data class SpokenLanguage(val lang: String, val level: Int, val reads: Boolean? = null)

data class PlayerCard(val band: SeatBand, val speaks: List<SpokenLanguage> = emptyList(), val learn: List<String> = emptyList(), val surprise: Boolean = false) {
    val sendsCard: Boolean get() = band != SeatBand.Under13
    val complete: Boolean get() = band == SeatBand.Under13 || speaks.isNotEmpty()

    fun withSpoken(lang: String, level: Int): PlayerCard {
        val rest = speaks.filterNot { it.lang == lang }
        val next = if (level in 1..4) rest + SpokenLanguage(lang, level, if (level == 4) true else null) else rest
        return copy(speaks = next.take(MAX_SPEAKS), learn = learn - lang)
    }

    fun toggleLearn(lang: String): PlayerCard = when {
        lang in learn -> copy(learn = learn - lang)
        speaks.any { it.lang == lang } || learn.size >= MAX_LEARN -> this
        else -> copy(learn = learn + lang, surprise = false)
    }

    companion object {
        const val MAX_LEARN = 3
        const val MAX_SPEAKS = 6
        val levels = listOf(1 to "A few words", 2 to "Getting by", 3 to "Fluent", 4 to "First language")
    }
}

@Serializable
data class CardsReply(val cards: List<kotlinx.serialization.json.JsonObject> = emptyList(), val share: Boolean = false)

@Serializable
data class TeachView(
    val round: Int,
    val speakerId: String,
    val status: String,
    val lang: String? = null,
    val choices: List<String> = emptyList(),
    val answer: Int? = null,
    val clip: String? = null,
    val myGuess: Int? = null,
    val guessed: Int = 0,
    val teacherAward: Boolean? = null,
)

@Serializable
data class TeachReply(val teach: TeachView? = null)

@Serializable
data class TriviaQuestion(val prompt: String, val choices: List<String>, val answer: Int)

@Serializable
data class TriviaView(
    val count: Int = 0,
    val current: Int = -1,
    val open: Boolean = false,
    val prompt: String? = null,
    val choices: List<String> = emptyList(),
    val answer: Int? = null,
    val myPick: Int? = null,
    val picked: Int = 0,
    val questions: List<TriviaQuestion>? = null,
    val scores: Map<String, Int> = emptyMap(),
)

@Serializable
data class TriviaReply(val trivia: TriviaView? = null)

@Serializable
data class AtlasClip(val clip: Int, val form: String, val licence: String? = null, val lang: String? = null, val meaning: String? = null)

@Serializable
data class AtlasReply(val rounds: List<AtlasClip> = emptyList())

@Serializable
data class ForeheadCard(val lang: String, val form: String, val meaning: String, val itemId: String = "")

@Serializable
data class ForeheadReply(val cards: List<ForeheadCard> = emptyList())

@Serializable
data class LeagueRow(val rank: Int, val name: String, val points: Int, val me: Boolean = false)

@Serializable
data class LeagueBoard(val week: kotlinx.serialization.json.JsonElement? = null, val tier: Int = 1, val tierName: String = "", val board: List<LeagueRow> = emptyList())

enum class LeaveResult(val wire: String) { Left("left"), Handoff("handoff"), Closed("closed"), Moved("moved");
    companion object { fun of(wire: String?): LeaveResult = entries.firstOrNull { it.wire == wire } ?: Left }
}
