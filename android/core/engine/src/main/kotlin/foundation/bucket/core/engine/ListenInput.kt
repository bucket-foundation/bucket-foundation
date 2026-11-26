package foundation.bucket.core.engine

import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

object ListenInput {
    private val LEMMA = Regex("^\\S{1,40}$")
    private val KEY = Regex("[^A-Za-z0-9._:/-]")
    private const val MAX_LEMMAS = 200

    private fun key(prefix: String, id: String): String = "$prefix:${id.replace(KEY, "-")}".take(128)

    private fun round(x: Double): Long = floor(x + 0.5).toLong()

    private fun lemmasOf(items: List<InputItem>): List<String> = items.flatMap { i -> i.tokens.map { it.lemma } }.filter { LEMMA.matches(it) }

    fun audioCoverage(lemmas: List<String>, p: (String) -> Double): Double {
        if (lemmas.isEmpty()) return 0.0
        val sum = lemmas.sumOf { min(1.0, max(0.0, p(it))) }
        return round(sum / lemmas.size * 1e4) / 1e4
    }

    fun chunks(seconds: Double): List<Int> {
        val out = mutableListOf<Int>()
        var left = max(0L, round(seconds))
        while (left > 0) {
            val s = min(InputStage.MAX_EXPOSURE_SECONDS.toLong(), left)
            out += s.toInt()
            left -= s
        }
        return out
    }

    fun radioExposures(stationId: String, startedAt: Long, listenedMs: Double, p: (String) -> Double, captions: List<InputItem>? = null): List<ExposureInput> {
        val lemmas = lemmasOf(captions.orEmpty())
        val coverage = if (lemmas.isEmpty()) 0.0 else audioCoverage(lemmas, p)
        val seen = lemmas.distinct().take(MAX_LEMMAS)
        val unit = key("radio", stationId)
        return chunks(listenedMs / 1000).mapIndexed { i, s ->
            ExposureInput(key(unit, "${Math.floorDiv(startedAt, 1000L)}.$i"), unit, seen, emptyList(), s, coverage, completed = false, revealed = false)
        }
    }

    fun clipExposure(clip: InputItem, listenedMs: Double, completed: Boolean, p: (String) -> Double): ExposureInput? {
        val seconds = min(InputStage.MAX_EXPOSURE_SECONDS.toLong(), max(0L, round(listenedMs / 1000))).toInt()
        if (clip.kind != "audio" || seconds <= 0) return null
        val lemmas = lemmasOf(listOf(clip))
        val id = key("clip", clip.id)
        return ExposureInput(id, id, lemmas.distinct().take(MAX_LEMMAS), emptyList(), seconds, audioCoverage(lemmas, p), completed, revealed = false)
    }
}
