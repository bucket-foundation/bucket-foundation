package com.polingual.app

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class VideoCue(val start: Double, val end: Double, val text: Map<String, String> = emptyMap())

@Serializable
data class VideoDoc(
    val id: String,
    val title: String = "",
    val channel: String = "",
    val duration: Double = 0.0,
    val source_lang: String = "en",
    val langs: List<String> = emptyList(),
    val cues: List<VideoCue> = emptyList(),
)

@Serializable
data class VideoEntry(
    val id: String,
    val title: String = "",
    val channel: String = "",
    val duration: Double = 0.0,
    val source_lang: String = "en",
    val langs: List<String> = emptyList(),
)

@Serializable
data class VideoIndex(val videos: List<VideoEntry> = emptyList())

@Serializable
data class SavedWord(val word: String, val lang: String, val videoId: String, val at: Double)

object VideoLogic {
    val json = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }

    fun parseDoc(text: String): VideoDoc = json.decodeFromString(VideoDoc.serializer(), text).let { d -> d.copy(cues = d.cues.sortedBy { it.start }) }

    fun parseIndex(text: String): VideoIndex {
        val trimmed = text.trimStart()
        return if (trimmed.startsWith("[")) VideoIndex(json.decodeFromString(kotlinx.serialization.builtins.ListSerializer(VideoEntry.serializer()), trimmed))
        else json.decodeFromString(VideoIndex.serializer(), trimmed)
    }

    fun activeCue(cues: List<VideoCue>, t: Double): Int {
        var lo = 0
        var hi = cues.size - 1
        var found = -1
        while (lo <= hi) {
            val mid = (lo + hi) / 2
            if (cues[mid].start <= t) { found = mid; lo = mid + 1 } else hi = mid - 1
        }
        return if (found >= 0 && t < cues[found].end) found else -1
    }

    fun defaultLangs(available: List<String>, preferred: List<String>, source: String): List<String> {
        val ordered = (listOf(source) + preferred).distinct().filter { it in available }
        val picked = (ordered + available).distinct().take(MAX_LANGS)
        return if (picked.size >= MIN_LANGS || available.size < MIN_LANGS) picked else available.take(MIN_LANGS)
    }

    fun toggleLang(current: List<String>, lang: String): List<String> = when {
        lang in current -> if (current.size > MIN_LANGS) current - lang else current
        current.size >= MAX_LANGS -> current.drop(1) + lang
        else -> current + lang
    }

    fun words(text: String): List<String> = text.split(Regex("\\s+")).filter { it.isNotBlank() }

    fun clean(token: String): String = token.trim { !it.isLetterOrDigit() && it != '\'' && it != '-' }.lowercase()

    fun addSaved(list: List<SavedWord>, word: SavedWord): List<SavedWord> =
        if (word.word.isBlank() || list.any { it.word == word.word && it.lang == word.lang }) list else (list + word).takeLast(500)

    fun clock(seconds: Double): String {
        val s = seconds.toInt().coerceAtLeast(0)
        return "%d:%02d".format(s / 60, s % 60)
    }

    const val MIN_LANGS = 2
    const val MAX_LANGS = 4
}

class Combo {
    var streak = 0
        private set
    var best = 0
        private set
    var xp = 0
        private set

    fun hit(): Int {
        streak += 1
        best = maxOf(best, streak)
        val gain = BASE_XP + minOf(streak - 1, 4) * BONUS_XP
        xp += gain
        return gain
    }

    fun miss() { streak = 0 }

    val multiplier: Int get() = 1 + minOf(streak - 1, 4).coerceAtLeast(0)

    companion object {
        const val BASE_XP = 10
        const val BONUS_XP = 5
    }
}

object DayStreak {
    fun next(lastDay: String?, count: Int, today: String): Int {
        if (lastDay == today) return count.coerceAtLeast(1)
        val yesterday = runCatching { java.time.LocalDate.parse(today).minusDays(1).toString() }.getOrNull()
        return if (lastDay != null && lastDay == yesterday) count + 1 else 1
    }
}
